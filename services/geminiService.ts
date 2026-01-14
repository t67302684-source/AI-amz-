
import { GoogleGenAI, Type } from "@google/genai";

// 确保从环境变量中正确获取 API_KEY
const getApiKey = () => {
  const key = process.env.API_KEY;
  if (!key) {
    console.error("未检测到环境变量 API_KEY，请确保在 Vercel 中已配置。");
  }
  return key || "";
};

export const analyzeListing = async (asinOrUrl: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  // 强化版提示词：利用搜索工具绕过直接爬虫限制
  const prompt = `
    你是一个亚马逊运营专家。现在需要分析竞争对手：${asinOrUrl}。
    
    由于亚马逊官网有严格的反爬机制，请执行以下多重搜索策略：
    1. 使用 Google Search 检索该 ASIN 的 Google Shopping、Walmart、eBay 镜像页面或第三方监控工具（如 Keepa, CamelCamelCamel）的公开缓存。
    2. 提取该产品的正式标题、核心五点卖点 (Bullet Points)、物理属性（材质、颜色、尺寸、重量）。
    3. 视觉分析任务：
       - 搜索该 ASIN 在 Google 图片索引中的公开 CDN URL（通常是 m.media-amazon.com 开头的地址）。
       - 分析其主图和辅图的视觉构图逻辑。
       - 为每种图片（主图、生活场景、细节特写）生成一套高精度的 AI 绘图脚本。
    
    必须严格按 JSON 格式返回。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // 使用更强大的 Pro 模型进行复杂搜索分析
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            attributes: {
              type: Type.OBJECT,
              properties: {
                material: { type: Type.STRING },
                color: { type: Type.STRING },
                size: { type: Type.STRING },
                weight: { type: Type.STRING }
              }
            },
            imageStrategies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  headline: { type: Type.STRING },
                  subheadline: { type: Type.STRING },
                  strategy: { type: Type.STRING },
                  aiPrompt: { type: Type.STRING },
                  imageUrl: { type: Type.STRING, description: "从搜索结果中提取的 m.media-amazon.com 图片链接" }
                }
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("AI 分析过程中出错:", error);
    return null;
  }
};

export const generateProductImage = async (prompt: string, baseImage?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const contents: any = { parts: [{ text: prompt }] };
  
  if (baseImage) {
    const base64Data = baseImage.includes(',') ? baseImage.split(',')[1] : baseImage;
    contents.parts.unshift({
      inlineData: {
        mimeType: 'image/png',
        data: base64Data
      }
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents,
    config: {
      imageConfig: { aspectRatio: "1:1" }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};
