// আপনার আসল Gemini API Key এখানে বসাবেন (যেমন: AIzaSy...)
const API_KEY = "YOUR_GEMINI_API_KEY_HERE";

// Elements
const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const historyList = document.getElementById("historyList");
const newChatBtn = document.getElementById("newChatBtn");
const authTriggerBtn = document.getElementById("authTriggerBtn");
const userEmailDisplay = document.getElementById("userEmailDisplay");
const authModal = document.getElementById("authModal");
const emailInputField = document.getElementById("emailInputField");
const submitAuthBtn = document.getElementById("submitAuthBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const emailErrorMsg = document.getElementById("emailErrorMsg");
const fileUpload = document.getElementById("fileUpload");
const attachmentPreview = document.getElementById("attachmentPreview");

// App State Cache
let chats = JSON.parse(localStorage.getItem("sohel_ai_chats")) || [];
let currentChatId = null;
let currentUser = localStorage.getItem("sohel_ai_user") || null;
let guestMessageCount = parseInt(localStorage.getItem("sohel_guest_count")) || 0;
let attachedFiles = [];

// Daily Limits State Management (Refreshes everyday at 12:00 AM / Midnight)
function checkDailyLimits() {
    const now = new Date();
    const lastResetDate = localStorage.getItem("sohel_last_reset");
    const todayDateString = now.toDateString();

    if (lastResetDate !== todayDateString) {
        localStorage.setItem("sohel_last_reset", todayDateString);
        localStorage.setItem("sohel_img_count", "0");
        localStorage.setItem("sohel_video_count", "0");
    }
}
checkDailyLimits();

// Init User & UI
if (currentUser) {
    userEmailDisplay.textContent = currentUser;
    authTriggerBtn.textContent = "Sign Out";
}

renderHistory();
if (chats.length > 0) {
    loadChat(chats[0].id);
}

// Input Auto-resize & Button State
userInput.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = (this.scrollHeight) + "px";
    sendBtn.disabled = this.value.trim() === "" && attachedFiles.length === 0;
});

// File Attachments Handler
fileUpload.addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    let imgCount = parseInt(localStorage.getItem("sohel_img_count")) || 0;
    let videoCount = parseInt(localStorage.getItem("sohel_video_count")) || 0;

    for (let file of files) {
        if (file.type.startsWith("image/")) {
            if (imgCount >= 5) {
                alert("Image limit reached: Maximum 5 images allowed per day.");
                return;
            }
            imgCount++;
            localStorage.setItem("sohel_img_count", imgCount);
        } else if (file.type.startsWith("video/")) {
            if (videoCount >= 2) {
                alert("Video limit reached: Maximum 2 videos allowed per day.");
                return;
            }
            videoCount++;
            localStorage.setItem("sohel_video_count", videoCount);
        }

        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
            attachedFiles.push({ type: file.type, data: uploadEvent.target.result });
            renderPreviews();
            sendBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }
});

function renderPreviews() {
    attachmentPreview.innerHTML = "";
    attachedFiles.forEach((file) => {
        const thumb = document.createElement("img");
        thumb.src = file.data;
        thumb.className = "preview-thumb";
        attachmentPreview.appendChild(thumb);
    });
}

// Strict Email Validation (Blocks Temp Mail & Numbers Only)
function isValidRealEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return false;

    const blockedDomains = [
        "tempmail.com", "throwawaymail.com", "10minutemail.com", "fakemail.com", 
        "mailinator.com", "yopmail.com", "guerrillamail.com", "sharklasers.com", 
        "getnada.com", "dispostable.com", "trashmail.com", "temp-mail.org",
        "maildrop.cc", "mintemail.com", "tempmailaddress.com"
    ];

    const domain = email.split("@")[1].toLowerCase();
    if (blockedDomains.includes(domain)) return false;

    const localPart = email.split("@")[0];
    if (/^\d+$/.test(localPart)) return false;

    return true;
}

authTriggerBtn.addEventListener("click", () => {
    if (currentUser) {
        localStorage.removeItem("sohel_ai_user");
        currentUser = null;
        userEmailDisplay.textContent = "Guest User";
        authTriggerBtn.textContent = "Sign In";
        alert("Logged out successfully.");
    } else {
        authModal.style.display = "flex";
    }
});

closeModalBtn.addEventListener("click", () => {
    authModal.style.display = "none";
});

submitAuthBtn.addEventListener("click", () => {
    const email = emailInputField.value.trim();
    if (!isValidRealEmail(email)) {
        emailErrorMsg.textContent = "Please enter a valid, original email address (Temp mails/numbers not allowed).";
        return;
    }

    currentUser = email;
    localStorage.setItem("sohel_ai_user", email);
    userEmailDisplay.textContent = email;
    authTriggerBtn.textContent = "Sign Out";
    authModal.style.display = "none";
    emailInputField.value = "";
    emailErrorMsg.textContent = "";
    alert("Successfully Signed In!");
});

// Chat Management & History Caching
newChatBtn.addEventListener("click", () => {
    currentChatId = null;
    chatBox.innerHTML = `<div class="welcome-screen"><h1>What can I help with today?</h1></div>`;
});

function saveChatToCache(userText, botText) {
    if (!currentChatId) {
        currentChatId = "chat_" + Date.now();
        const newChatObj = {
            id: currentChatId,
            title: userText.slice(0, 30) + (userText.length > 30 ? "..." : ""),
            messages: []
        };
        chats.unshift(newChatObj);
    }

    const currentChat = chats.find(c => c.id === currentChatId);
    if (currentChat) {
        currentChat.messages.push({ role: "user", text: userText, files: [...attachedFiles] });
        currentChat.messages.push({ role: "bot", text: botText });
    }

    localStorage.setItem("sohel_ai_chats", JSON.stringify(chats));
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = "";
    chats.forEach(chat => {
        const item = document.createElement("div");
        item.className = "history-item";
        item.textContent = chat.title;
        item.addEventListener("click", () => loadChat(chat.id));
        historyList.appendChild(item);
    });
}

function loadChat(chatId) {
    currentChatId = chatId;
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    chatBox.innerHTML = "";
    chat.messages.forEach(msg => {
        appendMessageUI(msg.text, msg.role === "user" ? "user-message" : "bot-message");
    });
}

function appendMessageUI(text, className) {
    const welcome = chatBox.querySelector(".welcome-screen");
    if (welcome) welcome.remove();

    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${className}`;
    msgDiv.textContent = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Send Message & Gemini API Integration (sohelbhai thinking...)
async function handleSendMessage() {
    const text = userInput.value.trim();
    if (text === "" && attachedFiles.length === 0) return;

    if (!currentUser) {
        guestMessageCount++;
        localStorage.setItem("sohel_guest_count", guestMessageCount);
        if (guestMessageCount > 3) {
            authModal.style.display = "flex";
            emailErrorMsg.textContent = "Please sign in with a valid email to continue chatting.";
            return;
        }
    }

    const currentFiles = [...attachedFiles];
    userInput.value = "";
    userInput.style.height = "auto";
    attachedFiles = [];
    attachmentPreview.innerHTML = "";
    sendBtn.disabled = true;

    appendMessageUI(text, "user-message");

    // sohelbhai thinking... Indicator
    const thinkingId = "think_" + Date.now();
    const thinkingDiv = document.createElement("div");
    thinkingDiv.className = "message bot-message";
    thinkingDiv.id = thinkingId;
    thinkingDiv.textContent = "sohelbhai thinking...";
    chatBox.appendChild(thinkingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        let contentsPayload = [{ parts: [{ text: text }] }];

        if (currentFiles.length > 0) {
            currentFiles.forEach(file => {
                const base64Data = file.data.split(",")[1];
                const mimeType = file.type;
                contentsPayload[0].parts.push({
                    inline_data: { mime_type: mimeType, data: base64Data }
                });
            });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: contentsPayload })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message || "API Error");
        }

        const aiReply = data.candidates[0].content.parts[0].text;

        document.getElementById(thinkingId).remove();
        appendMessageUI(aiReply, "bot-message");

        saveChatToCache(text, aiReply);

    } catch (error) {
        console.error("API Error:", error);
        document.getElementById(thinkingId).remove();
        appendMessageUI("দুঃখিত, এপিআই কানেক্ট করতে সমস্যা হচ্ছে। আপনার সঠিক Gemini API Key বসানো আছে কি না চেক করুন।", "bot-message");
    }
}

sendBtn.addEventListener("click", handleSendMessage);
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});

// Voice Input Support (Web Speech API)
const voiceBtn = document.getElementById("voiceBtn");
if ('webkitSpeechRecognition' in window || 'speechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';

    voiceBtn.addEventListener("click", () => {
        recognition.start();
        voiceBtn.style.color = "#ef4444";
    });

    recognition.onresult = (event) => {
        const speechText = event.results[0][0].transcript;
        userInput.value += " " + speechText;
        userInput.style.height = "auto";
        userInput.style.height = (userInput.scrollHeight) + "px";
        sendBtn.disabled = false;
        voiceBtn.style.color = "";
    };

    recognition.onerror = () => {
        voiceBtn.style.color = "";
    };
} else {
    voiceBtn.style.display = "none";
}
