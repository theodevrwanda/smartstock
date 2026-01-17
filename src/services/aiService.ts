const GEMINI_API_KEY = "AIzaSyBJFcTGwBB_XFd0IvE6Ez7yJruGqwucs0Q";

export interface Message {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export const getAIResponse = async (history: Message[], userMessage: string): Promise<string> => {
    try {
        // Use gemini-3-flash for the best balance of speed and intelligence
        const MODEL_ID = "gemini-3-flash-preview"; 
        const API_VERSION = "v1beta"; // or "v1" for stable
        
        const response = await fetch(
            `https://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        ...history, // Include history if you want it to remember the conversation
                        { role: 'user', parts: [{ text: userMessage }] }
                    ]
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return `API Error (${response.status}): ${data.error?.message || JSON.stringify(data)}`;
        }

        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text;
        }

        return `Unexpected response format: ${JSON.stringify(data)}`;

    } catch (error: any) {
        return `Exception: ${error.message}`;
    }
};