
import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeListing = async (asinOrUrl: string) => {
  const ai = getAI();
  
  // 改进的提示词：要求模型利用搜索工具访问多个公开渠道（包括亚马逊镜像、缓存或其他零售平台）以获取准确数据
  const prompt = `
    你是一名资深的亚马逊Listing优化专家。
    任务：深入分析 ASIN 或链接：${asinOrUrl}。
    
    注意：如果直接访问受限，请利用 Google Search 检索该 ASIN 在全球各站点、第三方监控工具（如 Keepa, Helium 10 公开页）的信息。
    
    请提取以下内容：
    1. 产品的精确标题（去冗余后）。
    2. 核心五点描述（提炼最有说服力的卖点）。
    3. 详细属性：材质、颜色、尺寸、重量。
    4. 视觉策略提取：
       - 分析其主图和辅图的构图逻辑。
       - 识别其使用的核心视觉元素（如：对比图、尺寸标注图、使用场景图）。
       - 为每种图片类型提供一个 AI 图像生成提示词（Prompt），要求能够复现其作图风格。

    必须返回标准的 JSON 格式。
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
                imageUrl: { type: Type.STRING, description: "尝试寻找公开的图片 URL，如果找不到则留空" }
              }
            }
          }
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("解析分析结果失败:", e);
    return null;
  }
};

export const generateProductImage = async (prompt: string, baseImage?: string) => {
  const ai = getAI();
  const contents: any = { parts: [{ text: prompt }] };
  
  if (baseImage) {
    // 确保处理 base64 格式
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
