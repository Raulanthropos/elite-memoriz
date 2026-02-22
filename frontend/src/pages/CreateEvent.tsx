import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Check, Star, Zap, Crown, Upload, X } from 'lucide-react';
import ImageCropper from '../components/ImageCropper';
import { DEFAULT_COVERS } from '../utils/image'; // FIX: Removed unused 'getEventCoverUrl'
import { API_URL } from '../lib/config';

const CreateEvent = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    category: 'wedding' as 'wedding' | 'baptism' | 'party' | 'other',
    package: 'BASIC',
    coverImage: '' 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { id: 'wedding', label: 'Wedding', icon: '💒' },
    { id: 'baptism', label: 'Baptism', icon: '👶' },
    { id: 'party', label: 'Party', icon: '🎉' },
    { id: 'other', label: 'Other', icon: '🎈' }
  ];

  const tiers = [
      { id: 'BASIC', name: 'Basic', price: 'Free', icon: <Star size={24} className="text-gray-400"/>, features: ['1 Event', '100MB Storage', 'Basic Support'] },
      { id: 'PREMIUM', name: 'Pro', price: '$9', icon: <Zap size={24} className="text-yellow-400"/>, features: ['5 Events', '1GB Storage', 'Priority Support'] },
      { id: 'VIP', name: 'VIP', price: '$29', icon: <Crown size={24} className="text-purple-400"/>, features: ['Unlimited Events', '10GB Storage', 'Dedicated Agent'] },
  ];

  const nextStep = (e?: React.FormEvent) => {
      e?.preventDefault();
      setStep(2);
  };

  const prevStep = () => {
      setStep(1);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setPreviewUrl(URL.createObjectURL(file)); // Show raw preview
      setIsCropping(true); // Trigger Cropper immediately
      // Reset input so same file can be selected again if needed
      e.target.value = ''; 
    }
  };

  const onCropComplete = (croppedBlob: Blob) => {
      // 1. Convert Blob to File
      const file = new File([croppedBlob], "cover.jpg", { type: "image/jpeg" });
      setSelectedFile(file);
      
      // 2. Update Preview
      const croppedUrl = URL.createObjectURL(croppedBlob);
      setPreviewUrl(croppedUrl);
      
      // 3. Close Modal
      setIsCropping(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      let finalCoverImage = formData.coverImage;

      // Logic: If user picked a file, upload it. If not, send the Default URL.
      if (selectedFile) {
          const fileName = `${Date.now()}-cover.jpg`;
          const { error: uploadError } = await supabase.storage
              .from('uploads')
              .upload(fileName, selectedFile);
          
          if (uploadError) throw uploadError;
          finalCoverImage = fileName; // Save just the filename
      } else {
          // If no custom file, use the default URL for the category
          finalCoverImage = DEFAULT_COVERS[formData.category];
      }

      const payload = {
          ...formData,
          coverImage: finalCoverImage
      };

      const res = await fetch(`${API_URL}/api/host/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to create event');
      }

      navigate('/dashboard');
    } catch (err: any) {
      console.error('Error creating event:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Use the new helper to show current selection or default
  const displayPreview = previewUrl || DEFAULT_COVERS[formData.category];

  return (
    <div className="min-h-screen bg-gray-950 p-8 text-white flex items-center justify-center">
      <div className="max-w-xl w-full">
        {/* Navigation / Progress */}
        <div className="flex items-center justify-between pointer-events-none mb-8">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-indigo-400' : 'text-gray-600'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-indigo-500 bg-indigo-500/20' : 'border-gray-700'}`}>1</div>
                <span className="font-bold text-sm">Details</span>
            </div>
            <div className={`h-0.5 flex-1 mx-4 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-800'}`}></div>
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-indigo-400' : 'text-gray-600'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-indigo-500 bg-indigo-500/20' : 'border-gray-700'}`}>2</div>
                <span className="font-bold text-sm">Select Plan</span>
            </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl relative overflow-hidden">
            {error && (
                <div className="mb-6 p-4 bg-red-900/50 border border-red-800 rounded-lg text-red-200 text-sm">
                    {error}
                </div>
            )}

            {/* Step 1: Event Details */}
            {step === 1 && (
            <form onSubmit={nextStep} className="space-y-6 animate-in slide-in-from-right duration-300">
                <h1 className="text-2xl font-bold mb-6">Create New Event</h1>
                
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Event Name</label>
                    <input 
                    type="text" 
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="e.g. John & Jane's Wedding"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Event Date</label>
                    <input 
                    type="date" 
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Event Type</label>
                    <div className="grid grid-cols-2 gap-3">
                    {categories.map((cat) => (
                        <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat.id as any })}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                            formData.category === cat.id 
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750 hover:border-gray-600'
                        }`}
                        >
                        <span className="text-2xl mb-1">{cat.icon}</span>
                        <span className="text-sm font-medium">{cat.label}</span>
                        </button>
                    ))}
                    </div>
                </div>

                {/* Cover Image Selection */}
                <div>
                   <label className="block text-sm font-medium text-gray-400 mb-2">Cover Image</label>
                   <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-800 border border-gray-700 group">
                      <img 
                        src={displayPreview} 
                        alt="Preview" 
                        className="w-full h-full object-cover transition-opacity duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 backdrop-blur-md border border-white/20 shadow-xl"
                          >
                             <Upload size={18} />
                             {selectedFile ? 'Change Image' : 'Upload Custom Cover'}
                          </button>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        className="hidden"
                      />
                   </div>
                   {selectedFile && (
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedFile(null);
                                setPreviewUrl(null);
                                if(fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="text-xs text-red-400 hover:text-red-300 mt-2 flex items-center gap-1"
                        >
                            <X size={12} /> Remove custom image (Revert to default)
                        </button>
                   )}
                </div>


                <div className="flex gap-4 pt-4">
                    <button 
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg"
                    >
                        Next: Select Plan
                    </button>
                </div>
            </form>
            )}

            {/* Step 2: Tier Selection */}
            {step === 2 && (
            <div className="animate-in slide-in-from-right duration-300">
                <h1 className="text-2xl font-bold mb-6">Choose a Plan</h1>
                
                <div className="space-y-3 mb-8">
                    {tiers.map((tier) => (
                        <div 
                            key={tier.id}
                            onClick={() => setFormData({ ...formData, package: tier.id })}
                            className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                formData.package === tier.id 
                                ? 'bg-indigo-900/20 border-indigo-500 ring-1 ring-indigo-500' 
                                : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-gray-800 rounded-lg border border-gray-700">
                                    {tier.icon}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{tier.name}</h3>
                                    <p className="text-xs text-gray-400">{tier.features.join(' • ')}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-white">{tier.price}</span>
                                {formData.package === tier.id && <Check size={16} className="text-indigo-400 ml-auto mt-1" />}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-4">
                    <button 
                        type="button"
                        onClick={prevStep}
                        className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-all"
                    >
                        Back
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-[2] px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create Event'}
                    </button>
                </div>
            </div>
            )}
        </div>
      </div>

      {/* Cropper Modal - This uses your fixed Z-Index component */}
      {isCropping && previewUrl && (
          <ImageCropper 
            imageSrc={previewUrl}
            aspectRatio={16/9}
            onCropComplete={onCropComplete}
            onCancel={() => {
                setIsCropping(false);
                setPreviewUrl(null);
                setSelectedFile(null);
                if(fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
      )}
    </div>
  );
};

export default CreateEvent;