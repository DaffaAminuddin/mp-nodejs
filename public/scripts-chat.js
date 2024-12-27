const chatbotToggler = document.querySelector(".chatbot-toggler");
const closeBtn = document.querySelector(".close-btn");
const chatbox = document.querySelector(".chatbox");
const chatInput = document.querySelector(".chat-input textarea");
const sendChatBtn = document.querySelector(".chat-input span");


let userMessage = null;
const inputInitHeight = chatInput.scrollHeight;

const createChatLi = (message, className) => {
    const chatLi = document.createElement("li");
    chatLi.classList.add("chat", `${className}`);
    let chatContent = className === "outgoing" ? `<p></p>` : `<span class="material-symbols-outlined">smart_toy</span><p></p>`;
    chatLi.innerHTML = chatContent;
    chatLi.querySelector("p").textContent = message;
    return chatLi;
};

const generateResponse = async (chatElement) => {
    const messageElement = chatElement.querySelector("p");
    messageElement.textContent = "Thinking...";

    try {
        const response = await fetch("/api/chatbot-assistant", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input_text: userMessage }),
        });

        if (!response.ok) {
            throw new Error("Failed to fetch response from middleware");
        }

        const data = await response.json();
        const responseText = data.response || "No response from backend";

        // Remove the "Thinking..." message 
        chatElement.remove();

        // Memproses teks dan blok kode
        const parts = responseText.split(/```(.*?)```/gs); // Memisahkan teks dan blok kode
        parts.forEach((part, index) => {
            if (index % 2 === 0) {
                // Teks biasa
                if (part.trim()) {
                    chatbox.appendChild(createChatLi(part.trim(), "incoming"));
                }
            } else {
                // Blok kode
                const codeContainer = createCodeContainer(part.trim());
                chatbox.appendChild(codeContainer);
            }
        });
    } catch (error) {
        console.error("Error fetching response:", error);
        messageElement.textContent = "An error occurred. Please try again.";
    }

    chatbox.scrollTo(0, chatbox.scrollHeight);
};

const createCodeContainer = (code) => {
    const container = document.createElement("div");
    container.className = "code-container";

    const pre = document.createElement("pre");
    const codeElement = document.createElement("code");
    codeElement.textContent = code;
    pre.appendChild(codeElement);

    const copyButton = document.createElement("button");
    copyButton.className = "copy-btn";
    copyButton.textContent = "Copy";
    copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(code);
        alert("Code copied to clipboard!");
    });

    container.appendChild(pre);
    container.appendChild(copyButton);
    return container;
};

const handleChat = () => {
    userMessage = chatInput.value.trim();
    if (!userMessage) return;

    // Clear the input textarea and set its height to default
    chatInput.value = "";
    chatInput.style.height = `${inputInitHeight}px`;

    // Append the user's message to the chatbox
    chatbox.appendChild(createChatLi(userMessage, "outgoing"));
    chatbox.scrollTo(0, chatbox.scrollHeight);

    setTimeout(() => {
        // Display "Thinking..." message while waiting for the response
        const incomingChatLi = createChatLi("Thinking...", "incoming");
        chatbox.appendChild(incomingChatLi);
        chatbox.scrollTo(0, chatbox.scrollHeight);
        generateResponse(incomingChatLi);
    }, 600);
};

chatInput.addEventListener("input", () => {
    // Adjust the height of the input textarea based on its content
    chatInput.style.height = `${inputInitHeight}px`;
    chatInput.style.height = `${chatInput.scrollHeight}px`;
});

chatInput.addEventListener("keydown", (e) => {
    // If Enter key is pressed without Shift key and the window
    // width is greater than 800px, handle the chat
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
        e.preventDefault();
        handleChat();
    }
});

sendChatBtn.addEventListener("click", handleChat);
closeBtn.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
