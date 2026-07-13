const Booking = require("../../models/booking-model");
const User = require("../../models/user-model");

const chatbotController = {};

// Helper to provide automated fallback answers for wedding photography inquiries
const getFallbackResponse = (message, role) => {
    const text = message.toLowerCase();
    
    if (text.includes("pricing") || text.includes("package") || text.includes("cost") || text.includes("price")) {
        return "WedLens offers three premium wedding photography packages:\n" +
               "1. **Silver Package (₹49,999)**: Single photographer, candid coverage, digital album delivery within 30 days.\n" +
               "2. **Gold Package (₹89,999)**: Two photographers, cinematic videography, raw footage sharing, custom hardcover physical album.\n" +
               "3. **Platinum Package (₹1,49,999)**: Cinematic crew, drone aerial coverage, pre-wedding shoot included, luxury design digital & physical albums.\n\n" +
               "You can select your preferred package during the client booking process.";
    }
    
    if (text.includes("book") || text.includes("schedule") || text.includes("reserve")) {
        if (role === "photographer") {
            return "As a photographer, your bookings are assigned by the administrator based on your profile preferences. Go to the 'Assignments' tab in your dashboard to accept or decline incoming requests.";
        }
        return "To book a photographer, log in to your Client Dashboard, browse verified photographers, select one, choose a date and time slot, and send the request. Once approved, proceed to checkout for payment.";
    }

    if (text.includes("payment") || text.includes("razorpay") || text.includes("pay")) {
        return "WedLens payments are securely processed via Razorpay. Client payments must be completed in advance to lock the booking. Photographers can track their earnings in the 'Earnings' tab of the Photographer Dashboard.";
    }

    if (text.includes("cancel") || text.includes("refund")) {
        return "Clients can cancel bookings from their 'My Bookings' panel. Cancellations made more than 48 hours prior to the event are eligible for a refund (contact support for assistance). Cancelled shoots release photographer slots immediately.";
    }

    if (text.includes("verify") || text.includes("approve")) {
        return "All photographers are manually vetted by WedLens administrators for quality and professionalism. Admins can approve or reject photographer applications from the Admin Panel under the 'Photographers' management tab.";
    }

    return "Hello! I am your WedLens Assistant. I can help you with questions about photography packages, booking procedures, payments, cancellations, and account approvals. How can I assist you today?";
};

chatbotController.chat = async (req, res) => {
    try {
        const { message } = req.body;
        const userRole = req.role || "client";
        const userName = req.user ? req.user.name : "User";

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        const apiKey = process.env.GEMINI_API_KEY;

        // If Gemini API Key is available, make a direct request to Gemini API
        if (apiKey) {
            try {
                const promptContext = `You are a helpful AI assistant for the WedLens Wedding Photography Platform.
                The current user is logged in as a "${userRole}" and their name is "${userName}".
                Provide answers related to WedLens. The platform has three packages: Silver (₹49,999), Gold (₹89,999), and Platinum (₹1,49,999).
                Booking requires client payments via Razorpay. Photographer slots cannot overlap.
                Keep responses concise, premium, and friendly.
                
                User query: ${message}`;

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: promptContext }]
                        }]
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (aiText) {
                        return res.json({ response: aiText.trim() });
                    }
                }
                console.warn("[CHATBOT] Gemini API request failed. Falling back to rule-based response.");
            } catch (apiErr) {
                console.error("[CHATBOT] Gemini API Error:", apiErr.message);
            }
        }

        // Fallback rule-based response
        const fallbackAnswer = getFallbackResponse(message, userRole);
        return res.json({ response: fallbackAnswer });

    } catch (err) {
        console.error("Chatbot Controller Error:", err);
        return res.status(500).json({ error: "Failed to process chat query" });
    }
};

module.exports = chatbotController;
