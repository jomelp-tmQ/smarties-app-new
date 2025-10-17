export const objections = [
    {
        id: 1,
        title: "Unclear pricing",
        preview: "I like your product, but I can't figure out how much it will cost for my team of 15.",
        detected: 12,
        tag: "critical"
    },
    {
        id: 2,
        title: "Use case compatibility",
        preview: "Does this work for my use case? We're in healthcare and need HIPAA compliance.",
        detected: 8,
        tag: "frequent"
    },
    {
        id: 3,
        title: "Implementation time",
        preview: "How long will it take to get this up and running? We need something quick.",
        detected: 6,
        tag: "moderate"
    }
];


export const suggestedResponses = [
    {
        id: 1,
        title: "Response #1",
        tags: ["Integrations", "Workflow", "Efficiency"],
        conversionRate: 4.5,
        text: `I completely understand the concern! Our platform integrates seamlessly with Slack, Salesforce, and over 50 other tools to ensure your workflows remain smooth.`,
        status: "Top Performer"
    },
    {
        id: 2,
        title: "Response #2",
        tags: ["Integrations", "Tech Stack"],
        conversionRate: 3.8,
        text: `Thanks for asking! We’ve recently added native integrations with HubSpot and Zapier, making it easy to connect with your existing stack.`,
        status: "Strong"
    },
    {
        id: 3,
        title: "Response #1",
        tags: ["Ease of Use", "Onboarding", "Support"],
        conversionRate: 4.2,
        text: `That’s a valid concern! We provide guided onboarding, video tutorials, and 24/7 support to make adoption smooth and simple for your team.`,
        status: "Top Performer"
    },
    {
        id: 4,
        title: "Response #2",
        tags: ["User Experience", "Training"],
        conversionRate: 3.9,
        text: `Many of our customers initially thought it might be complex, but within two weeks they were up and running with minimal training.`,
        status: "Strong"
    },
    {
        id: 5,
        title: "Response #1",
        tags: ["Pricing", "Value", "ROI"],
        conversionRate: 4.3,
        text: `I hear you on budget! Our flexible plans are designed to maximize ROI—customers often recover the cost within the first month of use.`,
        status: "Top Performer"
    }
];


export const nudgeTools = {
    testimonials: {
        name: "John Thompson",
        position: "CTO at TechFlow",
        text: `"The pricing was actually much more reasonable than we expected for the value we're getting. Our team of 20 saw ROI within the first month!"`,
        stars: 5,
        image: "../images/img_1img.png"
    },
    countdown: {
        hours: 2,
        minutes: 15,
        seconds: 42
    },
    discount: 20,
    urgencyTypes: ["Scarcity"]
};