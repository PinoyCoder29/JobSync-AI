export const SKILL_CATEGORIES = {
  "Frontend Development": [
    "React",
    "Next.js",
    "TypeScript",
    "JavaScript",
    "HTML5",
    "CSS3",
    "Bootstrap",
    "Tailwind CSS",
    "Vue.js",
  ],

  "Backend Development": ["Node.js", "Express.js", "FastAPI", "Nodemailer"],

  "Databases & ORM": ["PostgreSQL", "MySQL", "SQL", "Prisma ORM", "Redis"],

  "Cloud & Deployment": ["Vercel", "Neon", "Cloudinary", "Hugging Face"],

  "Tools & Development": [
    "Git",
    "GitHub",
    "Postman",
    "Visual Studio Code",
    "XAMPP",
  ],

  "AI / Machine Learning": [
    "TensorFlow",
    "PyTorch",
    "OpenCV",
    "MediaPipe",
    "GRU",
    "MobileNetV2",
  ],

  "Programming Languages": [
    "TypeScript",
    "JavaScript",
    "Python",
    "Python (Basic)",
    "Java",
    "Java (Basic)",
  ],

  "Web Development": [
    "REST API",
    "API Integration",
    "Responsive Web Design",
    "Web Development",
    "Frontend Development",
    "Backend Development",
    "Full-Stack Development",
  ],

  "Testing & Other": [
    "Software Testing",
    "Debugging",
    "Technical Documentation",
    "Problem Solving",
  ],

  "Office & Productivity": [
    "Microsoft Excel",
    "Microsoft Word",
    "Microsoft PowerPoint",
    "Google Docs",
    "Google Sheets",
    "Google Workspace",
  ],

  "Business & Office": [
    "Bookkeeping",
    "Data Entry",
    "Data Management",
    "Document Management",
    "File Management",
  ],

  Design: ["Adobe Photoshop", "Canva", "UI/UX Design"],

  "Soft Skills": [
    "Communication",
    "Leadership",
    "Teamwork",
    "Problem Solving",
    "Time Management",
    "Adaptability",
    "Critical Thinking",
    "Attention to Detail",
    "Organization",
    "Decision Making",
    "Creativity",
    "Work Ethic",
    "Multitasking",
    "Collaboration",
    "Fast Learning",
  ],

  Languages: [
    "English",
    "Filipino",
    "Japanese",
    "Korean",
    "Spanish",
    "Mandarin",
    "German",
    "French",
  ],

  Technical: [],
} as const;

export type SkillCategoryName = keyof typeof SKILL_CATEGORIES;

export const CATEGORY_PLACEHOLDERS: Record<SkillCategoryName, string> = {
  "Frontend Development": "e.g. React, Next.js, Bootstrap",

  "Backend Development": "e.g. Node.js, Express.js, FastAPI",

  "Databases & ORM": "e.g. PostgreSQL, MySQL, Prisma ORM",

  "Cloud & Deployment": "e.g. Vercel, AWS, Cloudinary",

  "Tools & Development": "e.g. Git, GitHub, Postman",

  "AI / Machine Learning": "e.g. TensorFlow, OpenCV, MediaPipe",

  "Programming Languages": "e.g. TypeScript, JavaScript, Python",

  "Web Development": "e.g. REST API, Responsive Web Design",

  "Testing & Other": "e.g. Software Testing, Debugging",

  "Office & Productivity": "e.g. Microsoft Excel, Microsoft Word",

  "Business & Office": "e.g. Bookkeeping, Data Entry",

  Design: "e.g. Adobe Photoshop, Canva, UI/UX Design",

  "Soft Skills": "e.g. Communication, Leadership, Teamwork",

  Languages: "e.g. English, Filipino, Japanese",

  Technical: "e.g. Hardware Troubleshooting, Networking",
};
