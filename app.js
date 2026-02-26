import { Auth } from 'aws-amplify';
import { REST } from 'aws-amplify';
import { Storage } from 'aws-amplify';

// ========== COGNITO AUTHENTICATION ==========
async function login() {
    try {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const user = await Auth.signIn(email, password);
        console.log("Login successful:", user);
        // Store user ID in DynamoDB via Lambda
        await storeUserSession(user.username);
        window.location.href = "dashboard.html";
    } catch (error) {
        alert("Login failed: " + error.message);
        console.error("Login error:", error);
    }
}

async function logout() {
    try {
        await Auth.signOut();
        window.location.href = "index.html";
    } catch (error) {
        console.error("Logout error:", error);
    }
}

// ========== DYNAMODB - Store User Session ==========
async function storeUserSession(userName) {
    try {
        const response = await REST.post('LearningAPI', '/user/session', {
            body: {
                userName: userName,
                timestamp: new Date().toISOString(),
                platform: 'web'
            }
        });
        console.log("Session stored:", response);
    } catch (error) {
        console.error("Error storing session:", error);
    }
}

// ========== DYNAMODB - Save Practice Results ==========
async function savePracticeResult(practiceType, result, score) {
    try {
        const user = await Auth.currentAuthenticatedUser();
        const response = await REST.post('LearningAPI', '/practice/result', {
            body: {
                userId: user.username,
                practiceType: practiceType,
                result: result,
                score: score,
                timestamp: new Date().toISOString()
            }
        });
        console.log("Practice result saved:", response);
        return response;
    } catch (error) {
        console.error("Error saving result:", error);
    }
}

// ========== READING PRACTICE - Transcribe & DynamoDB ==========
async function checkAnswer() {
    const answer = document.getElementById("answer").value;
    const result = document.getElementById("result");

    try {
        const user = await Auth.currentAuthenticatedUser();
        
        // Call Lambda to verify answer (processes logic)
        const verifyResponse = await REST.post('LearningAPI', '/practice/verify-answer', {
            body: {
                userId: user.username,
                userAnswer: answer,
                correctAnswer: "paris",
                questionId: "question_1"
            }
        });

        if (verifyResponse.isCorrect) {
            result.innerText = "✓ Correct!";
            result.style.color = "green";
            await savePracticeResult("reading", answer, 100);
        } else {
            result.innerText = "✗ Try again.";
            result.style.color = "red";
            await savePracticeResult("reading", answer, 0);
        }
    } catch (error) {
        result.innerText = "Error checking answer: " + error.message;
        console.error(error);
    }
}

// ========== WRITING PRACTICE - Save to S3 & DynamoDB ==========
async function submitEssay() {
    const essay = document.getElementById("essay").value;
    const message = document.getElementById("message");

    if (!essay.trim()) {
        message.innerText = "Please write something first.";
        return;
    }

    try {
        const user = await Auth.currentAuthenticatedUser();
        const fileName = `essays/${user.username}/${Date.now()}_essay.txt`;

        // Upload essay to S3
        await Storage.put(fileName, essay, {
            level: 'public',
            contentType: 'text/plain'
        });

        // Save metadata to DynamoDB via Lambda
        const response = await REST.post('LearningAPI', '/practice/submit-essay', {
            body: {
                userId: user.username,
                s3Key: fileName,
                wordCount: essay.split(" ").length,
                submittedAt: new Date().toISOString()
            }
        });

        message.innerText = "✓ Essay submitted successfully! File saved to S3.";
        message.style.color = "green";
        document.getElementById("essay").value = "";
        
        // Save result metrics
        await savePracticeResult("writing", "essay_submitted", response.score || 0);
    } catch (error) {
        message.innerText = "Error submitting essay: " + error.message;
        console.error(error);
    }
}

// ========== SPEAKING PRACTICE - Transcribe & Polly ==========
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

async function startPractice() {
    const speakMsg = document.getElementById("speakMsg");
    
    try {
        if (!isRecording) {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                await processSpeechRecording(audioChunks);
            };

            mediaRecorder.start();
            isRecording = true;
            speakMsg.innerText = "🎤 Recording... Click to stop.";
            speakMsg.style.color = "red";
        } else {
            mediaRecorder.stop();
            isRecording = false;
            speakMsg.innerText = "Processing your response...";
        }
    } catch (error) {
        speakMsg.innerText = "Microphone access denied: " + error.message;
        console.error(error);
    }
}

// ========== AWS TRANSCRIBE - Convert Speech to Text ==========
async function processSpeechRecording(audioChunks) {
    const speakMsg = document.getElementById("speakMsg");
    
    try {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const user = await Auth.currentAuthenticatedUser();
        const fileName = `recordings/${user.username}/${Date.now()}_recording.wav`;

        // Upload audio to S3
        await Storage.put(fileName, audioBlob, {
            level: 'public',
            contentType: 'audio/wav'
        });

        // Call Lambda to trigger Transcribe job
        const transcribeResponse = await REST.post('LearningAPI', '/practice/transcribe-speech', {
            body: {
                userId: user.username,
                s3Key: fileName,
                questionId: "question_speaking_1"
            }
        });

        speakMsg.innerText = "Transcribing your response...";

        // Poll for transcription result (Lambda will store in DynamoDB)
        const transcriptionText = await pollTranscriptionResult(transcribeResponse.jobId);
        
        // Use Polly to read back feedback
        await textToSpeechFeedback("Your recording has been saved: " + transcriptionText);
        
        // Save result
        await savePracticeResult("speaking", transcriptionText, 0);
        speakMsg.innerText = "✓ Recording processed! Transcription: " + transcriptionText;
        
    } catch (error) {
        speakMsg.innerText = "Error processing recording: " + error.message;
        console.error(error);
    }
}

// ========== Poll for Transcription Results ==========
async function pollTranscriptionResult(jobId, maxAttempts = 12) {
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        try {
            const response = await REST.get('LearningAPI', `/practice/transcribe-status/${jobId}`);
            
            if (response.status === 'COMPLETED') {
                return response.transcription;
            }
        } catch (error) {
            console.error("Error polling transcription:", error);
        }
    }
    throw new Error("Transcription timeout");
}

// ========== AWS POLLY - Text to Speech ==========
async function textToSpeechFeedback(text) {
    try {
        const response = await REST.post('LearningAPI', '/practice/speak-feedback', {
            body: {
                text: text,
                voiceId: 'Joanna' // Options: Joanna, Matthew, Ivy, etc.
            }
        });

        // Play the audio
        const audio = new Audio(response.audioUrl);
        audio.play();
    } catch (error) {
        console.error("Error in text-to-speech:", error);
    }
}

// ========== Get User Dashboard Data ==========
async function loadUserDashboard() {
    try {
        const user = await Auth.currentAuthenticatedUser();
        const response = await REST.get('LearningAPI', `/user/dashboard/${user.username}`);
        
        console.log("Dashboard data:", response);
        // Display user stats, progress, etc.
        if (document.getElementById('userStats')) {
            document.getElementById('userStats').innerText = 
                `Sessions: ${response.totalSessions} | Total Score: ${response.totalScore}`;
        }
    } catch (error) {
        console.error("Error loading dashboard:", error);
    }
}

// ========== Get AI-Powered Summary using AWS Bedrock ==========
async function loadAISummary() {
    try {
        const user = await Auth.currentAuthenticatedUser();
        const response = await REST.get('LearningAPI', `/practice/summary/${user.username}`);
        
        console.log("AI Summary:", response);
        
        if (document.getElementById('aiSummary')) {
            document.getElementById('aiSummary').innerText = response.summary || 'No summary available yet. Practice more to get insights!';
        }
        
        if (document.getElementById('summaryTime')) {
            const timestamp = new Date(response.generatedAt).toLocaleString();
            document.getElementById('summaryTime').innerText = `Generated at: ${timestamp}`;
        }
    } catch (error) {
        console.error("Error loading AI summary:", error);
        if (document.getElementById('aiSummary')) {
            document.getElementById('aiSummary').innerText = 'Summary feature coming soon. Keep practicing!';
        }
    }
}

// Call on page load if authenticated
window.addEventListener('load', async () => {
    try {
        await Auth.currentAuthenticatedUser();
        loadUserDashboard();
        loadAISummary();
    } catch {
        // User not authenticated
    }
});

// Export functions for module imports
export { login, logout, checkAnswer, submitEssay, recordSpeech, loadUserDashboard, loadAISummary };