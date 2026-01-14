
export interface ListingAnalysis {
  title: string;
  bulletPoints: string[];
  attributes: {
    material: string;
    color: string;
    size: string;
    weight: string;
  };
}

export interface ImageStrategy {
  imageUrl: string;
  headline: string;
  subheadline: string;
  content: string;
  strategy: string;
  aiPrompt: string;
}

export interface GeneratedAsset {
  id: string;
  type: 'selling-point' | 'detail';
  title: string;
  subtitle: string;
  description: string;
  imageUrl?: string;
  isGenerating: boolean;
}
