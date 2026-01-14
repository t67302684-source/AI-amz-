
import React, { useState } from 'react';
import { analyzeListing, generateProductImage } from './services/geminiService';
import { ListingAnalysis, ImageStrategy, GeneratedAsset } from './types';

const Header = () => (
  <header className="bg-white border-b border-gray-200 sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white text-xl">
        <i className="fa-solid fa-bolt"></i>
      </div>
      <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
        亚马逊 AI 视觉专家
      </h1>
    </div>
    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500">
      <a href="#analyze" className="hover:text-orange-500 transition-colors">竞对分析</a>
      <a href="#generate" className="hover:text-orange-500 transition-colors">场景生成</a>
      <a href="#batch" className="hover:text-orange-500 transition-colors">套图创作</a>
    </nav>
  </header>
);

const SectionTitle = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="mb-8">
    <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
    <p className="text-gray-500 mt-1">{subtitle}</p>
  </div>
);

const App: React.FC = () => {
  const [asin, setAsin] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<(ListingAnalysis & { imageStrategies: ImageStrategy[] }) | null>(null);
  
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [customImageResult, setCustomImageResult] = useState<string | null>(null);
  const [isCustomGenerating, setIsCustomGenerating] = useState(false);

  const [assets, setAssets] = useState<GeneratedAsset[]>([
    { id: '1', type: 'selling-point', title: '核心功能', subtitle: '卖点 1', description: '展示产品在实际应用中的高效表现。', isGenerating: false },
    { id: '2', type: 'selling-point', title: '耐用性能', subtitle: '卖点 2', description: '展示优质材质和长久使用的可靠性。', isGenerating: false },
    { id: '3', type: 'selling-point', title: '便携设计', subtitle: '卖点 3', description: '展示产品轻便、易收纳的特点。', isGenerating: false },
    { id: '4', type: 'detail', title: '细节 A', subtitle: '微距展示', description: '展示产品的精细工艺和接口细节。', isGenerating: false },
    { id: '5', type: 'detail', title: '细节 B', subtitle: '功能局部', description: '展示操作按键或核心技术点。', isGenerating: false },
    { id: '6', type: 'detail', title: '细节 C', subtitle: '包装配件', description: '展示完整的开箱体验或丰富的配件。', isGenerating: false },
  ]);

  const handleAnalyze = async () => {
    if (!asin) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const result = await analyzeListing(asin);
      if (result) {
        setAnalysis(result);
        // 如果分析结果中有建议的文案，自动填充到批量素材中
        if (result.bulletPoints && result.bulletPoints.length >= 3) {
          setAssets(prev => prev.map((a, i) => {
            if (i < 3) return { ...a, title: result.bulletPoints[i].split(' ')[0], description: result.bulletPoints[i] };
            return a;
          }));
        }
      }
    } catch (error) {
      alert("分析失败，请检查 ASIN 是否正确或稍后再试。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const generateOneAsset = async (assetId: string) => {
    if (!baseImage) {
      alert("请先在下方‘智能视觉创作’板块上传产品白底图。");
      return;
    }
    
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, isGenerating: true } : a));
    const asset = assets.find(a => a.id === assetId);
    const prompt = `Professional Amazon marketing photo for the product. Theme: ${asset?.title}. ${asset?.description}. Keep the product shape, color, and brand logo exactly as shown in the original image. Pure commercial style. High resolution.`;
    
    try {
      const result = await generateProductImage(prompt, baseImage);
      if (result) {
        setAssets(prev => prev.map(a => a.id === assetId ? { ...a, imageUrl: result, isGenerating: false } : a));
      }
    } catch (e) {
      setAssets(prev => prev.map(a => a.id === assetId ? { ...a, isGenerating: false } : a));
    }
  };

  const handleCustomGenerate = async () => {
    if (!baseImage) return;
    setIsCustomGenerating(true);
    const prompt = `A professional commercial photo. Use the product from the uploaded image. Place it in a scene similar to the reference image. Maintain 100% product consistency. High-end lighting.`;
    try {
      const res = await generateProductImage(prompt, baseImage);
      setCustomImageResult(res);
    } finally {
      setIsCustomGenerating(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50 text-slate-800">
      <Header />
      
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-16">
        
        {/* Section 1: Analysis */}
        <section id="analyze" className="scroll-mt-24">
          <SectionTitle title="Listing 竞对深度洞察" subtitle="智能绕过反爬，实时提取亚马逊 Listing 核心数据与作图逻辑" />
          
          <div className="flex flex-col md:flex-row gap-4 p-6 bg-white rounded-2xl shadow-sm border border-gray-100 mb-10">
            <input 
              type="text" 
              placeholder="输入亚马逊 ASIN (例如: B08N5K17LH) 或产品全链接"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              value={asin}
              onChange={(e) => setAsin(e.target.value)}
            />
            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="bg-orange-500 text-white px-10 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAnalyzing ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-wand-magic"></i>}
              深度分析竞对
            </button>
          </div>

          {analysis && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Textual Analysis */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-md">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-orange-600">
                    <i className="fa-solid fa-align-left"></i> 文案分析
                  </h3>
                  <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">推荐标题</label>
                      <p className="text-sm font-semibold leading-relaxed mt-1">{analysis.title}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">核心参数</label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {Object.entries(analysis.attributes).map(([k, v]) => (
                          <div key={k} className="bg-orange-50/50 p-2 rounded-lg border border-orange-100/50">
                            <span className="block text-[10px] text-orange-400 font-bold">
                              {k === 'material' ? '材质' : k === 'color' ? '颜色' : k === 'size' ? '尺寸' : '重量'}
                            </span>
                            <span className="text-xs font-bold">{v || '未检出'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">五点描述亮点</label>
                      <ul className="mt-2 space-y-3">
                        {analysis.bulletPoints.map((bp, i) => (
                          <li key={i} className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 leading-normal">
                            {bp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Image Strategies */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                {analysis.imageStrategies?.map((strat, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                    <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                      {strat.imageUrl ? (
                         <img src={strat.imageUrl} alt="竞对图片参考" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-gray-300 flex flex-col items-center">
                          <i className="fa-solid fa-image-polaroid text-3xl mb-2"></i>
                          <span className="text-[10px]">视觉逻辑参考图</span>
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="mb-4">
                        <h4 className="font-bold text-gray-900">{strat.headline || `图片类型 ${i+1}`}</h4>
                        <p className="text-xs text-orange-500 font-bold">{strat.subheadline}</p>
                      </div>
                      <div className="space-y-4 text-xs text-gray-600 flex-1">
                        <div>
                          <p className="font-bold text-gray-400 mb-1">作图思路:</p>
                          <p className="bg-gray-50 p-2 rounded border border-gray-100">{strat.strategy}</p>
                        </div>
                        <div>
                          <p className="font-bold text-gray-400 mb-1">AI 生成脚本:</p>
                          <code className="block bg-slate-900 text-slate-300 p-2 rounded font-mono leading-tight">
                            {strat.aiPrompt}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Section 2: Generation */}
        <section id="generate" className="scroll-mt-24">
          <SectionTitle title="锁定一致性：智能场景合成" subtitle="提供产品图与效果参考图，AI 自动完成高精度合成" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-gray-200 hover:border-orange-300 transition-colors flex flex-col items-center justify-center min-h-[220px] relative">
                  {baseImage ? (
                    <div className="relative group w-full h-full flex items-center justify-center">
                      <img src={baseImage} className="max-h-40 object-contain" />
                      <button onClick={() => setBaseImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full shadow-lg">
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center text-center">
                      <i className="fa-solid fa-box-open text-orange-400 text-2xl mb-2"></i>
                      <span className="text-xs font-bold">上传白底图</span>
                      <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, setBaseImage)} />
                    </label>
                  )}
                </div>

                <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors flex flex-col items-center justify-center min-h-[220px] relative">
                  {refImage ? (
                    <div className="relative group w-full h-full flex items-center justify-center">
                      <img src={refImage} className="max-h-40 object-contain" />
                      <button onClick={() => setRefImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full shadow-lg">
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center text-center">
                      <i className="fa-solid fa-palette text-blue-400 text-2xl mb-2"></i>
                      <span className="text-xs font-bold">参考场景图</span>
                      <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, setRefImage)} />
                    </label>
                  )}
                </div>
              </div>
              
              <button 
                onClick={handleCustomGenerate}
                disabled={!baseImage || isCustomGenerating}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-black transition-all disabled:opacity-50"
              >
                {isCustomGenerating ? "正在进行一致性合成..." : "立即生成 (保持产品一致)"}
              </button>
            </div>

            <div className="bg-white rounded-3xl p-4 flex items-center justify-center min-h-[300px] border border-gray-200 shadow-inner">
              {customImageResult ? (
                <img src={customImageResult} className="w-full h-full object-contain rounded-2xl shadow-xl" />
              ) : (
                <div className="text-center text-gray-300">
                   <p className="text-sm">合成效果预览</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 3: Batch Assets */}
        <section id="batch" className="scroll-mt-24">
          <SectionTitle title="全套 A+ / Listing 素材批量创作" subtitle="基于竞对文案智能生成的 6 张关键素材图" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {assets.map((asset) => (
              <div key={asset.id} className="bg-white rounded-3xl border border-gray-100 shadow-md overflow-hidden flex flex-col hover:border-orange-200 transition-colors">
                <div className="aspect-square bg-slate-100 relative">
                  {asset.imageUrl ? (
                    <img src={asset.imageUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 p-8 text-center">
                      {asset.isGenerating ? (
                        <div className="flex flex-col items-center gap-3">
                           <i className="fa-solid fa-shimmer animate-pulse text-3xl text-orange-500"></i>
                           <p className="text-[10px] text-orange-500 font-bold">正在创作...</p>
                        </div>
                      ) : (
                        <i className="fa-solid fa-image-sparkles text-4xl opacity-20"></i>
                      )}
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full shadow-sm ${asset.type === 'selling-point' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'}`}>
                      {asset.type === 'selling-point' ? '核心卖点' : '细节展示'}
                    </span>
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col bg-white">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500">标题</span>
                      <input 
                        type="text" 
                        value={asset.title}
                        onChange={(e) => setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, title: e.target.value } : a))}
                        className="flex-1 text-sm font-bold text-slate-900 border-none p-0 focus:ring-0"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500">副标</span>
                      <input 
                        type="text" 
                        value={asset.subtitle}
                        onChange={(e) => setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, subtitle: e.target.value } : a))}
                        className="flex-1 text-xs text-orange-500 font-bold border-none p-0 focus:ring-0"
                      />
                    </div>
                  </div>
                  <textarea 
                    value={asset.description}
                    onChange={(e) => setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, description: e.target.value } : a))}
                    rows={3}
                    className="w-full text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 focus:ring-orange-500/20 resize-none mb-6"
                    placeholder="请输入作图提示词或文案内容..."
                  />
                  <button 
                    onClick={() => generateOneAsset(asset.id)}
                    disabled={asset.isGenerating || !baseImage}
                    className="mt-auto w-full py-3 bg-orange-50 text-orange-600 rounded-xl font-bold text-xs hover:bg-orange-100 transition-colors disabled:opacity-30"
                  >
                    生成当前图片
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
