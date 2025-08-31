"use client";
import React, { useState, useCallback, useRef } from "react";
import {
  Upload,
  Download,
  Image,
  Trash2,
  Settings,
  Zap,
  CheckCircle,
  AlertCircle,
  FileImage,
  Sparkles,
  Monitor,
  Smartphone,
  Globe,
} from "lucide-react";

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "processing" | "completed" | "error";
  convertedBlob?: Blob;
  originalSize: number;
  convertedSize?: number;
  progress?: number;
}

interface ConversionSettings {
  format: "jpeg" | "png" | "webp" | "avif";
  quality: number;
}

export default function ImageConverter() {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [settings, setSettings] = useState<ConversionSettings>({
    format: "webp",
    quality: 80,
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        handleFiles(selectedFiles);
      }
    },
    []
  );

  const handleFiles = useCallback((newFiles: File[]) => {
    const imageFiles = newFiles.filter((file) =>
      file.type.startsWith("image/")
    );

    const processedFiles: ImageFile[] = imageFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: "pending",
      originalSize: file.size,
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...processedFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
        if (fileToRemove.convertedBlob) {
          URL.revokeObjectURL(URL.createObjectURL(fileToRemove.convertedBlob));
        }
      }
      return prev.filter((file) => file.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    files.forEach(file => {
      URL.revokeObjectURL(file.preview);
      if (file.convertedBlob) {
        URL.revokeObjectURL(URL.createObjectURL(file.convertedBlob));
      }
    });
    setFiles([]);
  }, [files]);

  const convertImage = useCallback(
    async (imageFile: ImageFile): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new window.Image();
        
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          
          const mimeType = settings.format === 'jpeg' ? 'image/jpeg' : 
                          settings.format === 'png' ? 'image/png' :
                          settings.format === 'webp' ? 'image/webp' : 'image/webp';
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Conversion failed'));
            }
          }, mimeType, settings.quality / 100);
        };
        
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = imageFile.preview;
      });
    },
    [settings]
  );

  const convertAll = useCallback(async () => {
    const pendingFiles = files.filter((file) => file.status === "pending");

    for (const file of pendingFiles) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, status: "processing", progress: 30 } : f
        )
      );

      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, progress: 70 } : f
          )
        );

        const convertedBlob = await convertImage(file);
        
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  status: "completed",
                  convertedBlob,
                  convertedSize: convertedBlob.size,
                  progress: 100,
                }
              : f
          )
        );
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, status: "error" } : f))
        );
      }
    }
  }, [files, convertImage]);

  const downloadFile = useCallback(
    (file: ImageFile) => {
      if (file.convertedBlob) {
        const url = URL.createObjectURL(file.convertedBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${file.file.name.split(".")[0]}.${settings.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    },
    [settings.format]
  );

  const downloadAll = useCallback(() => {
    files.filter((f) => f.status === "completed").forEach(downloadFile);
  }, [files, downloadFile]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getCompressionRatio = (original: number, converted?: number) => {
    if (!converted) return 0;
    return Math.round(((original - converted) / original) * 100);
  };

  const totalOriginalSize = files.reduce((acc, f) => acc + f.originalSize, 0);
  const totalConvertedSize = files.reduce(
    (acc, f) => acc + (f.convertedSize || 0),
    0
  );
  const completedFiles = files.filter((f) => f.status === "completed").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/40 dark:from-slate-950 dark:via-blue-950/30 dark:to-purple-950/40">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-cyan-400/10 to-blue-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10">
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Header */}
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-3 mb-6 group">
              <div className="relative p-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
                <Image className="relative w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Filura
              </h1>
              <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
            </div>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Transform your images with cutting-edge compression technology. 
              <span className="font-semibold text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text"> Lightning-fast conversion</span> 
              {" "}with superior quality preservation.
            </p>
          </div>

          <div className="max-w-7xl mx-auto grid lg:grid-cols-4 gap-6 lg:gap-8">
            <div className="lg:col-span-3 space-y-6">
              {/* Upload Area */}
              <div
                className={`relative overflow-hidden rounded-3xl transition-all duration-500 ${
                  isDragging
                    ? "border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 scale-[1.02] shadow-2xl"
                    : "border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl"
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent dark:from-slate-800/50"></div>
                <div
                  className="relative p-8 sm:p-12 lg:p-16 text-center cursor-pointer group"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />

                  <div className="space-y-6">
                    <div
                      className={`mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center transition-all duration-500 shadow-lg group-hover:shadow-2xl ${
                        isDragging ? "scale-125 shadow-2xl" : "group-hover:scale-110"
                      }`}
                    >
                      <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 group-hover:bg-clip-text transition-all duration-300">
                        Drop your images here
                      </h3>
                      <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg">
                        or click to browse your files
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <span className="px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-700">
                          JPG
                        </span>
                        <span className="px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium border border-purple-200 dark:border-purple-700">
                          PNG
                        </span>
                        <span className="px-4 py-2 bg-gradient-to-r from-green-100 to-cyan-100 dark:from-green-900/30 dark:to-cyan-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium border border-green-200 dark:border-green-700">
                          WebP
                        </span>
                        <span className="px-4 py-2 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm font-medium border border-orange-200 dark:border-orange-700">
                          AVIF
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Files List */}
              {files.length > 0 && (
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
                  <div className="p-6 sm:p-8 border-b border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                          Files ({files.length})
                        </h2>
                        <p className="text-slate-600 dark:text-slate-300">
                          Manage your image conversion queue
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={convertAll}
                          disabled={files.every((f) => f.status !== "pending")}
                          className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                        >
                          <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          Convert All
                        </button>
                        <button
                          onClick={clearAll}
                          className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-semibold border border-slate-200 dark:border-slate-600 transition-all duration-300 hover:shadow-lg"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 sm:p-8">
                    <div className="grid gap-4">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className="relative bg-gradient-to-r from-white/50 to-slate-50/50 dark:from-slate-800/50 dark:to-slate-700/50 rounded-2xl border border-slate-200/50 dark:border-slate-600/50 p-4 sm:p-6 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group"
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="relative flex-shrink-0">
                              <img
                                src={file.preview}
                                alt={file.file.name}
                                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border-2 border-white dark:border-slate-600 shadow-lg"
                              />
                              {file.status === "processing" && (
                                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
                              )}
                              {file.status === "completed" && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                  <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <h4 className="font-semibold text-slate-800 dark:text-slate-100 truncate text-lg">
                                  {file.file.name}
                                </h4>
                                {file.status === "completed" && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium border border-green-200 dark:border-green-700">
                                    <CheckCircle className="w-3 h-3" />
                                    Ready
                                  </span>
                                )}
                                {file.status === "error" && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-medium border border-red-200 dark:border-red-700">
                                    <AlertCircle className="w-3 h-3" />
                                    Error
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-4 text-sm">
                                <span className="text-slate-600 dark:text-slate-400 font-medium">
                                  {formatFileSize(file.originalSize)}
                                </span>
                                {file.convertedSize && (
                                  <>
                                    <span className="text-slate-400">→</span>
                                    <span className="text-green-600 dark:text-green-400 font-semibold">
                                      {formatFileSize(file.convertedSize)}
                                    </span>
                                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-bold border border-green-200 dark:border-green-700">
                                      -{getCompressionRatio(file.originalSize, file.convertedSize)}%
                                    </span>
                                  </>
                                )}
                              </div>

                              {file.status === "processing" && file.progress !== undefined && (
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300 shadow-sm"
                                    style={{ width: `${file.progress}%` }}
                                  ></div>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              {file.status === "completed" && (
                                <button
                                  onClick={() => downloadFile(file)}
                                  className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                onClick={() => removeFile(file.id)}
                                className="p-3 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-700 transition-all duration-300 hover:scale-105"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {files.some((f) => f.status === "completed") && (
                      <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
                        <button
                          onClick={downloadAll}
                          className="w-full py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-3 group"
                        >
                          <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          Download All Converted Images
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Settings Panel */}
            <div className="space-y-6">
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
                <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-600" />
                    Settings
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
                    Configure output format and quality
                  </p>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Output Format */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Output Format
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "jpeg", label: "JPEG", desc: "Universal" },
                        { value: "png", label: "PNG", desc: "Lossless" },
                        { value: "webp", label: "WebP", desc: "Modern" },
                        { value: "avif", label: "AVIF", desc: "Latest" },
                      ].map((format) => (
                        <button
                          key={format.value}
                          onClick={() =>
                            setSettings((prev) => ({ ...prev, format: format.value as any }))
                          }
                          className={`p-3 rounded-xl border transition-all duration-300 text-left ${
                            settings.format === format.value
                              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-lg"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500"
                          }`}
                        >
                          <div className="font-semibold text-sm">{format.label}</div>
                          <div className={`text-xs ${settings.format === format.value ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}`}>
                            {format.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality Slider */}
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Quality
                      </label>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {settings.quality}%
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={settings.quality}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, quality: parseInt(e.target.value) }))
                        }
                        className="w-full h-3 bg-gradient-to-r from-red-200 via-yellow-200 to-green-200 dark:from-red-900/30 dark:via-yellow-900/30 dark:to-green-900/30 rounded-full appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, 
                            #fee2e2 0%, 
                            #fef3c7 50%, 
                            #dcfce7 100%)`,
                        }}
                      />
                      <style jsx>{`
                        .slider::-webkit-slider-thumb {
                          appearance: none;
                          width: 24px;
                          height: 24px;
                          background: linear-gradient(45deg, #3b82f6, #8b5cf6);
                          border-radius: 50%;
                          cursor: pointer;
                          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
                          transition: all 0.3s ease;
                        }
                        .slider::-webkit-slider-thumb:hover {
                          transform: scale(1.1);
                          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6);
                        }
                        .slider::-moz-range-thumb {
                          width: 24px;
                          height: 24px;
                          background: linear-gradient(45deg, #3b82f6, #8b5cf6);
                          border-radius: 50%;
                          cursor: pointer;
                          border: none;
                          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
                        }
                      `}</style>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Max Compression</span>
                      <span>Best Quality</span>
                    </div>
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent"></div>

                  {/* Quick Presets */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Quick Presets
                    </label>
                    <div className="space-y-2">
                      {[
                        {
                          name: "Web Optimized",
                          quality: 80,
                          format: "webp" as const,
                          icon: <Globe className="w-4 h-4" />,
                          desc: "Perfect for websites",
                          color: "from-blue-500 to-cyan-500"
                        },
                        {
                          name: "High Quality",
                          quality: 95,
                          format: "jpeg" as const,
                          icon: <Monitor className="w-4 h-4" />,
                          desc: "Minimal compression",
                          color: "from-green-500 to-emerald-500"
                        },
                        {
                          name: "Mobile Friendly",
                          quality: 65,
                          format: "webp" as const,
                          icon: <Smartphone className="w-4 h-4" />,
                          desc: "Optimized for mobile",
                          color: "from-purple-500 to-pink-500"
                        },
                      ].map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() =>
                            setSettings({
                              format: preset.format,
                              quality: preset.quality,
                            })
                          }
                          className="w-full p-4 text-left bg-slate-50 dark:bg-slate-800 hover:bg-gradient-to-r hover:from-slate-100 hover:to-blue-50 dark:hover:from-slate-700 dark:hover:to-blue-900/30 rounded-xl border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 hover:shadow-lg group"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 bg-gradient-to-r ${preset.color} rounded-lg text-white group-hover:scale-110 transition-transform duration-300`}>
                              {preset.icon}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800 dark:text-slate-100">
                                {preset.name}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {preset.desc} • {preset.format.toUpperCase()} • {preset.quality}%
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              {files.length > 0 && (
                <div className="bg-gradient-to-br from-white/90 to-slate-50/90 dark:from-slate-900/90 dark:to-slate-800/90 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
                  <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      Statistics
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                      Conversion progress and savings
                    </p>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-2xl border border-blue-200/50 dark:border-blue-800/50">
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                          {files.length}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          Total Files
                        </div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 rounded-2xl border border-green-200/50 dark:border-green-800/50">
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                          {completedFiles}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          Completed
                        </div>
                      </div>
                    </div>

                    {completedFiles > 0 && (
                      <>
                        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent"></div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              Original Size
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {formatFileSize(totalOriginalSize)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              Compressed Size
                            </span>
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {formatFileSize(totalConvertedSize)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              Space Saved
                            </span>
                            <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-sm font-bold shadow-lg">
                              {getCompressionRatio(totalOriginalSize, totalConvertedSize)}%
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Pro Tip */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 backdrop-blur-xl rounded-2xl border border-amber-200/50 dark:border-amber-800/50 p-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex-shrink-0">
                    <FileImage className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                      Pro Tip
                    </div>
                    <p className="text-amber-700 dark:text-amber-300 text-sm leading-relaxed">
                      WebP and AVIF formats provide superior compression while maintaining visual quality. 
                      Perfect for modern web applications!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="mt-16 sm:mt-20 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: <Zap className="w-6 h-6" />,
                title: "Lightning Fast",
                description: "Client-side processing with instant results using advanced canvas optimization",
                gradient: "from-yellow-400 to-orange-500",
                bg: "from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30",
                border: "border-yellow-200/50 dark:border-yellow-800/50"
              },
              {
                icon: <Image className="w-6 h-6" />,
                title: "Multiple Formats",
                description: "Full support for JPEG, PNG, WebP, AVIF with real format conversion",
                gradient: "from-blue-500 to-purple-600",
                bg: "from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30",
                border: "border-blue-200/50 dark:border-blue-800/50"
              },
              {
                icon: <Settings className="w-6 h-6" />,
                title: "Advanced Control",
                description: "Fine-tune compression quality with real-time preview and statistics",
                gradient: "from-green-500 to-teal-600",
                bg: "from-green-50 to-teal-50 dark:from-green-950/30 dark:to-teal-950/30",
                border: "border-green-200/50 dark:border-green-800/50"
              },
            ].map((feature, index) => (
              <div
                key={index}
                className={`group relative overflow-hidden bg-gradient-to-br ${feature.bg} backdrop-blur-sm rounded-3xl border ${feature.border} p-6 sm:p-8 text-center hover:shadow-2xl transition-all duration-500 hover:scale-105`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className={`w-16 h-16 mx-auto mb-6 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-800 dark:text-slate-100 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 group-hover:bg-clip-text transition-all duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}