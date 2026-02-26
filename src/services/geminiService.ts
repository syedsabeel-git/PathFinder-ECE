import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface CareerRecommendation {
  careerPaths: string[];
  internshipRoles: string[];
  skillsToLearn: string[];
  summary: string;
}

export interface ResumeData {
  education: string;
  skills: string;
  interests: string;
}

export async function scanResume(
  base64Data: string,
  mimeType: string
): Promise<ResumeData> {
  const prompt = `
    You are an expert recruiter. Extract the following information from this resume:
    1. Education (Degree, Year, Institution)
    2. Skills (Technical skills, programming languages, tools)
    3. Interests (Areas of interest, specializations)

    If any field is missing, provide a reasonable guess based on the context or leave it as a short descriptive string.
    Focus on Electronics and Communication Engineering (ECE) context if applicable.

    Provide the response in JSON format with the following structure:
    {
      "education": "...",
      "skills": "...",
      "interests": "..."
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
      {
        text: prompt,
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          education: { type: Type.STRING },
          skills: { type: Type.STRING },
          interests: { type: Type.STRING },
        },
        required: ["education", "skills", "interests"],
      },
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse scan response", e);
    throw new Error("Could not scan the resume. Please try manual input.");
  }
}

export async function getCareerRecommendations(
  education: string,
  skills: string,
  interests: string
): Promise<CareerRecommendation> {
  const prompt = `
    You are a career advisor specializing in Electronics and Communication Engineering (ECE).
    Based on the following student profile, provide career recommendations.
    
    Education: ${education}
    Skills: ${skills}
    Interests: ${interests}
    
    Provide the response in JSON format with the following structure:
    {
      "careerPaths": ["path1", "path2", ...],
      "internshipRoles": ["role1", "role2", ...],
      "skillsToLearn": ["skill1", "skill2", ...],
      "summary": "A brief encouraging summary of why these paths fit."
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          careerPaths: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          internshipRoles: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          skillsToLearn: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          summary: {
            type: Type.STRING,
          },
        },
        required: ["careerPaths", "internshipRoles", "skillsToLearn", "summary"],
      },
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    throw new Error("Could not generate recommendations. Please try again.");
  }
}
