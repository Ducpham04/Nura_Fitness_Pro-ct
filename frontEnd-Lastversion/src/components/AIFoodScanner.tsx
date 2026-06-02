import { useState, useRef } from 'react';
import {
  Camera, X, Upload, Sparkles, CheckCircle, AlertCircle,
  Loader2, Zap, Brain, Utensils, Flame, Beef, Apple
} from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';

interface FoodAnalysisResult {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidence: number;
  description: string;
  ingredients: string[];
}

interface Props {
  onAnalysisComplete?: (result: FoodAnalysisResult) => void;
}

export default function AIFoodScanner({ onAnalysisComplete }: Props) {
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<FoodAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { user } = useAuthContext();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      setIsScanning(true);
      setError(null);
    } catch (err) {
      setError('Unable to access camera. Please check permissions.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageDataUrl);
        stopCamera();
        analyzeImage(imageDataUrl);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageDataUrl = e.target?.result as string;
        setCapturedImage(imageDataUrl);
        analyzeImage(imageDataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (imageData: string) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Convert base64 to blob for API call
      const base64Data = imageData.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      
      // Create FormData for API call
      const formData = new FormData();
      formData.append('image', blob, 'food-image.jpg');
      
      // Call AI Gateway API
      const response = await fetch('/api/food-analysis/scan', {
        method: 'POST',
        headers: {
          'userId': user?.id?.toString() || '1',
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze food image');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const analysisResult: FoodAnalysisResult = {
          foodName: data.data.foodName || 'Unknown Food',
          calories: data.data.calories || 0,
          protein: data.data.protein || 0,
          carbs: data.data.carbs || 0,
          fat: data.data.fat || 0,
          fiber: data.data.fiber || 0,
          confidence: data.data.confidence || 0,
          description: data.data.description || '',
          ingredients: data.data.ingredients || []
        };
        
        setResult(analysisResult);
        onAnalysisComplete?.(analysisResult);
      } else {
        throw new Error(data.message || 'Analysis failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image');
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setCapturedImage(null);
    setError(null);
    stopCamera();
  };

  const macroNutrients = [
    { name: 'Calories', value: result?.calories || 0, unit: 'kcal', icon: Flame, color: 'text-orange-400' },
    { name: 'Protein', value: result?.protein || 0, unit: 'g', icon: Beef, color: 'text-red-400' },
    { name: 'Carbs', value: result?.carbs || 0, unit: 'g', icon: Apple, color: 'text-blue-400' },
    { name: 'Fat', value: result?.fat || 0, unit: 'g', icon: Utensils, color: 'text-yellow-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-electric flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div className="absolute inset-0 rounded-full bg-electric ai-pulse-ring" />
          </div>
          <div>
            <h3 className="font-grotesk font-bold text-white text-lg">AI Food Scanner</h3>
            <p className="text-neutral-400 text-sm">Powered by Gemini 3.1 Pro Vision</p>
          </div>
        </div>
      </div>

      {/* Scanner Interface */}
      {!result && !capturedImage && (
        <div className="space-y-4">
          {/* Camera View */}
          {isScanning ? (
            <div className="relative rounded-2xl overflow-hidden glass border border-white/5">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-64 object-cover"
              />
              
              {/* Camera Controls */}
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
                <button
                  onClick={capturePhoto}
                  className="w-16 h-16 rounded-full bg-lime hover:bg-lime/90 flex items-center justify-center transition-all active:scale-95"
                >
                  <Camera className="w-6 h-6 text-obsidian" />
                </button>
                <button
                  onClick={stopCamera}
                  className="w-12 h-12 rounded-full bg-danger/20 hover:bg-danger/30 flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5 text-danger" />
                </button>
              </div>
              
              {/* Scanning Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-4 border-2 border-lime/50 rounded-lg">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-lime" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-lime" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-lime" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-lime" />
                </div>
              </div>
            </div>
          ) : (
            /* Initial Options */
            <div className="space-y-4">
              <button
                onClick={startCamera}
                className="w-full glass rounded-2xl p-6 border border-white/5 hover:border-lime/20 transition-all card-hover flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-lime/10 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-lime" />
                </div>
                <div className="text-center">
                  <h4 className="font-grotesk font-semibold text-white mb-1">Take Photo</h4>
                  <p className="text-neutral-400 text-sm">Use camera to scan your food</p>
                </div>
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-obsidian text-neutral-400">or</span>
                </div>
              </div>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full glass rounded-2xl p-6 border border-white/5 hover:border-electric/20 transition-all card-hover flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-electric/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-electric" />
                </div>
                <div className="text-center">
                  <h4 className="font-grotesk font-semibold text-white mb-1">Upload Image</h4>
                  <p className="text-neutral-400 text-sm">Choose from your gallery</p>
                </div>
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}
        </div>
      )}

      {/* Analysis Loading */}
      {isAnalyzing && (
        <div className="glass rounded-2xl p-8 border border-white/5 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-electric flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div className="absolute inset-0 rounded-full bg-electric ai-pulse-ring" />
            </div>
            <Loader2 className="w-6 h-6 text-electric animate-spin" />
          </div>
          <h4 className="font-grotesk font-semibold text-white mb-2">Analyzing Food...</h4>
          <p className="text-neutral-400 text-sm">AI is identifying ingredients and calculating nutrition</p>
        </div>
      )}

      {/* Captured Image Preview */}
      {capturedImage && !result && !isAnalyzing && (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden glass border border-white/5">
            <img src={capturedImage} alt="Captured food" className="w-full h-64 object-cover" />
            <button
              onClick={reset}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-danger/20 hover:bg-danger/30 flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5 text-danger" />
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => analyzeImage(capturedImage)}
              className="flex-1 btn-lime py-3 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Analyze Food
            </button>
            <button
              onClick={reset}
              className="flex-1 bg-white/[0.06] hover:bg-white/[0.06] text-white py-3 rounded-xl font-grotesk font-medium transition-all"
            >
              Retake
            </button>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          {/* Food Info */}
          <div className="glass rounded-2xl p-6 border border-white/5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-grotesk font-bold text-white text-xl mb-1">{result.foodName}</h4>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="text-success text-sm font-medium">
                      {Math.round(result.confidence * 100)}% Confidence
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={reset}
                className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.06] flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>
            
            {result.description && (
              <p className="text-neutral-300 text-sm mb-4">{result.description}</p>
            )}
            
            {/* Macro Nutrients */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {macroNutrients.map(({ name, value, unit, icon: Icon, color }) => (
                <div key={name} className="text-center">
                  <div className={`w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center mx-auto mb-2`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="font-grotesk font-bold text-white text-lg">{value}</div>
                  <div className="text-neutral-400 text-xs">{name} ({unit})</div>
                </div>
              ))}
            </div>
            
            {/* Ingredients */}
            {result.ingredients.length > 0 && (
              <div>
                <h5 className="font-grotesk font-semibold text-white mb-2">Detected Ingredients</h5>
                <div className="flex flex-wrap gap-2">
                  {result.ingredients.map((ingredient, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-lime/10 text-lime text-xs font-grotesk font-medium rounded-full"
                    >
                      {ingredient}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <button 
              onClick={async () => {
                if (!result) return;
                setIsAnalyzing(true);
                try {
                  const response = await fetch('/api/daily-nutrition/log', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'userId': user?.id?.toString() || '1',
                    },
                    body: JSON.stringify({
                      userId: user?.id,
                      trackingDate: new Date().toISOString().split('T')[0],
                      mealName: result.foodName,
                      calories: result.calories,
                      protein: result.protein,
                      carbs: result.carbs,
                      fat: result.fat,
                      mealType: 'OTHER'
                    })
                  });
                  if (response.ok) {
                    window.dispatchEvent(new CustomEvent('trigger-confetti', { 
                      detail: { calories: result.calories, spent: 0 } 
                    }));
                    onAnalysisComplete?.(result);
                  }
                } catch (err) {
                  setError('Failed to log meal');
                } finally {
                  setIsAnalyzing(false);
                }
              }}
              disabled={isAnalyzing}
              className="flex-1 btn-lime py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              {isAnalyzing ? 'Logging...' : 'Log This Meal'}
            </button>
            <button
              onClick={reset}
              className="flex-1 bg-white/[0.06] hover:bg-white/[0.06] text-white py-3 rounded-xl font-grotesk font-medium transition-all"
            >
              Scan Another
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="glass rounded-2xl p-6 border border-danger/20">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-danger" />
            <h4 className="font-grotesk font-semibold text-danger">Analysis Failed</h4>
          </div>
          <p className="text-neutral-300 text-sm mb-4">{error}</p>
          <button onClick={reset} className="btn-lime py-2 w-full">
            Try Again
          </button>
        </div>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
