
import React, { useState } from 'react';
import { analyzeListing, generateProductImage } from './services/geminiService';
import { ListingAnalysis, ImageStrategy, GeneratedAsset } from './types';

const Header = () => (
  <header className="bg-white border-b border-gray-200 sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white text-xl shadow-lg shadow-orange-200">
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
    { id: '1', type: 'selling-point', title: '核心功能', subtitle: '主打卖点 01', description: '高科技感场景，展示产品在高端工作环境中的应用。', isGenerating: false },
    { id: '2', type: 'selling-point', title: '耐用材质', subtitle: '主打卖点 02', description: '户外自然光场景，展示产品材质的坚韧与抗损性。', isGenerating: false },
    { id: '3', type: 'selling-point', title: '人性化设计', subtitle: '主打卖点 03', description: '特写镜头，强调人体工学弧度与操作便捷性。', isGenerating: false },
    { id: '4', type: 'detail', title: '工艺细节', subtitle: '局部特写 01', description: '展示产品接缝、接口及Logo的精细做工。', isGenerating: false },
    { id: '5', type: 'detail', title: '操作界面', subtitle: '局部特写 02', description: '清晰展示按键、屏幕或调节开关的质感。', isGenerating: false },
    { id: '6', type: 'detail', title: '全家福/配件', subtitle: '局部特写 03', description: '俯拍角度展示产品及其所有精致配件。', isGenerating: false },
  ]);

  const handleAnalyze = async () => {
    if (!asin) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const result = await analyzeListing(asin);
      if (result && result.title) {
        setAnalysis(result);
        if (result.bulletPoints && result.bulletPoints.length >= 3) {
          setAssets(prev => prev.map((a, i) => {
            if (i < 3 && result.bulletPoints[i]) {
              return { ...a, title: result.bulletPoints[i].slice(0, 15), description: result.bulletPoints[i] };
            }
            return a;
          }));
        }
      } else {
        alert("分析结果不完整。可能是由于反爬限制严重，AI 未能搜集到足够信息，请尝试输入完整 URL。");
      }
    } catch (error) {
      alert("分析失败。请检查 Vercel 环境变量 API_KEY 是否配置正确，并确保 ASIN 正确。");
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
      alert("请先上传产品白底图。");
      return;
    }
    
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, isGenerating: true } : a));
    const asset = assets.find(a => a.id === assetId);
    const prompt = `Hyper-realistic Amazon listing photo. Theme: ${asset?.title}. Description: ${asset?.description}. Keep the product in the center, maintain 100% similarity in shape and color to the provided product image. Studio lighting, 8k resolution.`;
    
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
    const prompt = `Commercial product photography. Integrate the product from the first image into the environment and lighting style of the second image. Ensure the product remains unchanged and realistic. High-end finish.`;
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
          <SectionTitle title="竞对 Listing 深度提取" subtitle="通过多源搜索绕过反爬，获取最真实的 Listing 构成" />
          
          <div className="flex flex-col md:flex-row gap-4 p-6 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-white mb-10">
            <input 
              type="text" 
              placeholder="粘贴亚马逊 ASIN (如: B08N5K17LH) 或产品链接"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              value={asin}
              onChange={(e) => setAsin(e.target.value)}
            />
            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="bg-orange-500 text-white px-10 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAnalyzing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-bolt"></i>}
              智能提取并分析
            </button>
          </div>

          {analysis && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 文案面板 */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-white shadow-lg shadow-slate-200/50">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <i className="fa-solid fa-clipboard-check text-orange-500"></i> 文案情报
                    </h3>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">建议优化标题</span>
                      <p className="text-sm font-bold text-slate-900 mt-1 leading-relaxed">{analysis.title}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(analysis.attributes).map(([k, v]) => (
                        <div key={k} className="bg-slate-50 p-3 rounded-xl">
                          <span className="block text-[10px] text-slate-400 font-bold mb-1">
                            {k === 'material' ? '材质' : k === 'color' ? '颜色' : k === 'size' ? '尺寸' : '重量'}
                          </span>
                          <span className="text-xs font-black text-slate-700">{v || '未检出'}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">核心卖点提炼</span>
                      <div className="mt-3 space-y-3">
                        {analysis.bulletPoints.map((bp, i) => (
                          <div key={i} className="text-xs text-slate-600 bg-orange-50/30 p-3 rounded-xl border border-orange-100/30">
                            {bp}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 图片策略面板 */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                {analysis.imageStrategies?.map((strat, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-white shadow-lg shadow-slate-200/50 overflow-hidden flex flex-col group">
                    <div className="aspect-video bg-slate-100 flex items-center justify-center relative overflow-hidden">
                      {strat.imageUrl ? (
                         <img src={strat.imageUrl} alt="竞对图片" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      ) : (
                        <div className="text-slate-300 flex flex-col items-center">
                          <i className="fa-solid fa-image-polaroid text-3xl mb-2 opacity-20"></i>
                          <span className="text-[10px]">视觉逻辑占位图</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <span className="text-white text-[10px] font-bold">竞对参考图 (CDN 链接)</span>
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h4 className="font-black text-slate-900 mb-1">{strat.headline || `模块 ${i+1}`}</h4>
                      <p className="text-xs text-orange-500 font-bold mb-4">{strat.subheadline}</p>
                      <div className="space-y-4 text-xs text-slate-500 flex-1">
                        <div className="bg-slate-50 p-3 rounded-xl">
                          <p className="font-black text-slate-400 mb-1">作图逻辑:</p>
                          <p className="leading-relaxed">{strat.strategy}</p>
                        </div>
                        <div className="bg-slate-900 p-3 rounded-xl">
                          <p className="font-black text-slate-500 mb-2">AI 绘图脚本:</p>
                          <code className="text-orange-200/80 font-mono leading-tight block break-words">
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

        {/* Section 2: Custom Generation */}
        <section id="generate" className="scroll-mt-24">
          <SectionTitle title="一致性场景实验室" subtitle="锁定产品样貌，在任何你喜欢的参考场景中自由合成" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-slate-200 hover:border-orange-400 transition-colors flex flex-col items-center justify-center min-h-[250px] relative group">
                  {baseImage ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <img src={baseImage} className="max-h-48 object-contain" />
                      <button onClick={() => setBaseImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-full shadow-lg transform group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-3">
                        <i className="fa-solid fa-camera-retro"></i>
                      </div>
                      <span className="text-sm font-black">上传我的白底图</span>
                      <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, setBaseImage)} />
                    </label>
                  )}
                </div>

                <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-slate-200 hover:border-blue-400 transition-colors flex flex-col items-center justify-center min-h-[250px] relative group">
                  {refImage ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <img src={refImage} className="max-h-48 object-contain" />
                      <button onClick={() => setRefImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-full shadow-lg transform group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-3">
                        <i className="fa-solid fa-lightbulb"></i>
                      </div>
                      <span className="text-sm font-black">上传参考氛围图</span>
                      <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, setRefImage)} />
                    </label>
                  )}
                </div>
              </div>
              
              <button 
                onClick={handleCustomGenerate}
                disabled={!baseImage || isCustomGenerating}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl shadow-slate-300 hover:bg-black transition-all transform active:scale-95 disabled:opacity-50"
              >
                {isCustomGenerating ? "AI 深度合成中，请稍候..." : "立即生成 (保持产品色彩与细节)"}
              </button>
            </div>

            <div className="bg-white rounded-3xl p-6 flex items-center justify-center min-h-[350px] border border-white shadow-xl shadow-slate-200/50">
              {customImageResult ? (
                <img src={customImageResult} className="w-full h-full object-contain rounded-2xl animate-in zoom-in duration-300" />
              ) : (
                <div className="text-center">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fa-solid fa-sparkles text-slate-200 text-3xl"></i>
                   </div>
                   <p className="text-sm font-bold text-slate-300">生成效果将在此时呈现</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 3: Batch Assets */}
        <section id="batch" className="scroll-mt-24">
          <SectionTitle title="Listing 全套素材创作" subtitle="自动生成 3 张高转化卖点图 + 3 张质感细节特写图" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {assets.map((asset) => (
              <div key={asset.id} className="bg-white rounded-3xl border border-white shadow-lg shadow-slate-200/50 overflow-hidden flex flex-col hover:border-orange-200 transition-all group">
                <div className="aspect-square bg-slate-50 relative overflow-hidden">
                  {asset.imageUrl ? (
                    <img src={asset.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 p-8 text-center">
                      {asset.isGenerating ? (
                        <div className="flex flex-col items-center gap-3">
                           <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                           <p className="text-xs text-orange-500 font-black">正在渲染像素...</p>
                        </div>
                      ) : (
                        <i className="fa-solid fa-magic-wand-sparkles text-5xl opacity-10"></i>
                      )}
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg ${asset.type === 'selling-point' ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'}`}>
                      {asset.type === 'selling-point' ? '核心卖点图' : '工艺细节图'}
                    </span>
                  </div>
                </div>
                
                <div className="p-7 flex-1 flex flex-col">
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-300 uppercase">TITLE</span>
                      <input 
                        type="text" 
                        value={asset.title}
                        onChange={(e) => setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, title: e.target.value } : a))}
                        className="flex-1 text-sm font-black text-slate-800 border-none p-0 focus:ring-0"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-300 uppercase">SUB</span>
                      <input 
                        type="text" 
                        value={asset.subtitle}
                        onChange={(e) => setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, subtitle: e.target.value } : a))}
                        className="flex-1 text-xs text-orange-500 font-black border-none p-0 focus:ring-0"
                      />
                    </div>
                  </div>
                  <textarea 
                    value={asset.description}
                    onChange={(e) => setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, description: e.target.value } : a))}
                    rows={3}
                    className="w-full text-xs text-slate-500 bg-slate-50 p-4 rounded-2xl border border-slate-100 focus:ring-orange-500/20 resize-none mb-6 leading-relaxed"
                  />
                  <button 
                    onClick={() => generateOneAsset(asset.id)}
                    disabled={asset.isGenerating || !baseImage}
                    className="mt-auto w-full py-4 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl font-black text-xs hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all disabled:opacity-30"
                  >
                    开始生成单图
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
