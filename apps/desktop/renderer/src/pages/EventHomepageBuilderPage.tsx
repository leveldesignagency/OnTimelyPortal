import React, { useState, useContext, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ThemeContext } from '../ThemeContext';
import { supabase, getEvent, type Event, uploadImageToStorage, validateImageFile } from '../lib/supabase';
import ImageCollageModal, { LAYOUTS } from '../components/ImageCollageModal';
import TOSModal from '../components/TOSModal';
import { getCurrentUser, getCurrentUserCompanyId } from '../lib/auth';

interface HomepageModule {
  id: string;
  type: 'title' | 'description' | 'image' | 'collage' | 'video' | 'list';
  content: any;
  position: number;
}

interface HomepageData {
  eventImage: string | null;
  welcomeTitle: string;
  welcomeDescription: string;
  modules: HomepageModule[];
}

// Helper to count total images for the event homepage
function countTotalImages(
  coverImageFile: File | null,
  moduleImageFiles: File[],
  collageImageFiles: File[],
  homepageData: HomepageData
): number {
  let count = 0;
  // Cover photo (if present or already uploaded)
  if (coverImageFile || homepageData.eventImage) count += 1;
  // Image modules (new uploads or existing)
  count += homepageData.modules.filter((m: HomepageModule) => m.type === 'image' && (m.content.url || m.content.file)).length;
  // Collage modules (all images in collages)
  homepageData.modules.forEach((m: HomepageModule) => {
    if (m.type === 'collage' && m.content.images) {
      count += m.content.images.length;
    }
  });
  // Add new files staged for upload
  count += moduleImageFiles.length;
  count += collageImageFiles.length;
  return count;
}

export default function EventHomepageBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  
  const eventId = location.state?.eventId;
  const [event, setEvent] = useState<Event | null>(null);
  const [homepageData, setHomepageData] = useState<HomepageData>({
    eventImage: null,
    welcomeTitle: 'WELCOME TO THE EVENT',
    welcomeDescription: 'THIS IS A DESCRIPTION',
    modules: [],
  });
  const [isEditing, setIsEditing] = useState<{ title: boolean; description: boolean }>({
    title: false,
    description: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageOffsetY, setImageOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startOffsetY, setStartOffsetY] = useState(0);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [collageModalOpen, setCollageModalOpen] = useState(false);
  const [editingCollageModuleId, setEditingCollageModuleId] = useState<string | null>(null);
  const wasDragging = useRef(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [tosModalOpen, setTosModalOpen] = useState(false);
  const [tosModalCallback, setTosModalCallback] = useState<(() => void) | null>(null);
  const [tosAcceptedForSession, setTosAcceptedForSession] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [moduleImageFiles, setModuleImageFiles] = useState<File[]>([]);
  const [collageImageFiles, setCollageImageFiles] = useState<File[]>([]);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  // Add to the top-level state:
  const [draggingImageModuleId, setDraggingImageModuleId] = useState<string | null>(null);
  const [imageModuleStartY, setImageModuleStartY] = useState(0);
  const [imageModuleStartOffsetY, setImageModuleStartOffsetY] = useState(0);
  const [hasSavedOnce, setHasSavedOnce] = useState(false);

  // Drag logic for image modules using refs
  const draggingImageModuleIdRef = useRef<string | null>(null);
  const imageModuleStartYRef = useRef(0);
  const imageModuleStartOffsetYRef = useRef(0);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const gapPx = 7 * 3.78; // 1mm ≈ 3.78px
  const bottomGapPx = 15 * 3.78; // 1mm ≈ 3.78px

  // Load event data
  useEffect(() => {
    (async () => {
      const id = await getCurrentUserCompanyId();
      setCompanyId(id);
      if (!id) {
        console.warn('No company_id found for current user! Multi-tenant data will not load.');
      }
    })();
  }, []);

  useEffect(() => {
    const loadEvent = async () => {
      if (!eventId || !companyId) return;
      try {
        const eventData = await getEvent(eventId);
        setEvent(eventData);
        // Load existing homepage data if exists
        const { data: existingData } = await supabase
          .from('event_homepage_data')
          .select('*')
          .eq('event_id', eventId)
          .eq('company_id', companyId)
          .single();
        if (existingData) {
          console.log('Loaded homepageData from DB:', existingData);
          setHomepageData({
            eventImage: existingData.event_image || null,
            welcomeTitle: existingData.welcome_title || 'WELCOME TO THE EVENT',
            welcomeDescription: existingData.welcome_description || 'THIS IS A DESCRIPTION',
            modules: existingData.modules || [],
          });
          setImageOffsetY(existingData.event_image_offset_y || 0);
          setHasSavedOnce(true); // Mark as already saved if loaded from DB
        }
      } catch (error) {
        console.error('Error loading event:', error);
      }
    };
    loadEvent();
  }, [eventId, companyId]);

  // Debug: Log current session and eventId
  useEffect(() => {
    (async () => {
      const session = await supabase.auth.getSession();
      console.log('Supabase session:', session);
    })();
  }, []);

  useEffect(() => {
    console.log('EventHomepageBuilderPage eventId:', eventId);
  }, [eventId]);

  const handleSave = async () => {
    if (!eventId || !companyId) {
      alert('Missing event or company ID. Cannot save homepage.');
      return;
    }
    setIsSaving(true);
    try {
      // Upload cover image
      let coverUrl: string | null = null;
      if (coverImageFile) {
        coverUrl = await uploadImageToStorage(coverImageFile, `cover/${eventId}`);
        setHomepageData(prev => ({ ...prev, eventImage: coverUrl }));
        setCoverImagePreview(URL.createObjectURL(coverImageFile));
      }
      // Upload module images and update module content
      const updatedModules = [...homepageData.modules];
      let moduleFileIndex = 0;
      for (let i = 0; i < updatedModules.length; i++) {
        const module = updatedModules[i];
        if (module.type === 'image' && module.content.url && module.content.url.startsWith('blob:')) {
          if (moduleImageFiles[moduleFileIndex]) {
            const uploadedUrl = await uploadImageToStorage(moduleImageFiles[moduleFileIndex], `module-image/${Date.now()}-${i}`);
            updatedModules[i] = {
              ...module,
              content: { ...module.content, url: uploadedUrl }
            };
            moduleFileIndex++;
          }
        }
      }
      // Upload collage images and update collage module content
      let collageFileIndex = 0;
      for (let i = 0; i < updatedModules.length; i++) {
        const module = updatedModules[i];
        if (module.type === 'collage' && module.content.images && module.content.images.length > 0) {
          const updatedImages = [...module.content.images];
          for (let j = 0; j < updatedImages.length; j++) {
            if (updatedImages[j].startsWith('blob:') && collageImageFiles[collageFileIndex]) {
              const uploadedUrl = await uploadImageToStorage(collageImageFiles[collageFileIndex], `collage-image/${Date.now()}-${i}-${j}`);
              updatedImages[j] = uploadedUrl;
              collageFileIndex++;
            }
          }
          updatedModules[i] = {
            ...module,
            content: { ...module.content, images: updatedImages }
          };
        }
      }
      // Debug log for event_image being saved
      console.log('Saving homepage with event_image:', coverUrl || homepageData.eventImage);
      const { error } = await supabase
        .from('event_homepage_data')
        .upsert({
          event_id: eventId,
          company_id: companyId,
          event_image: coverUrl || homepageData.eventImage,
          welcome_title: homepageData.welcomeTitle,
          welcome_description: homepageData.welcomeDescription,
          modules: updatedModules,
          event_image_offset_y: imageOffsetY,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'event_id,company_id'
        });
      if (error) throw error;
      setHomepageData(prev => ({ ...prev, modules: updatedModules }));
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      setHasSavedOnce(true); // Mark as saved after first save
    } catch (error) {
      console.error('Error saving homepage:', error);
      alert('Failed to save homepage. Please try again.');
    } finally {
      setIsSaving(false);
      setCoverImageFile(null);
      setCoverImagePreview(null);
      setModuleImageFiles([]);
      setCollageImageFiles([]);
    }
  };

  const addModule = (type: HomepageModule['type']) => {
    const newModule: HomepageModule = {
      id: Date.now().toString(),
      type,
      content: getDefaultContent(type),
      position: homepageData.modules.length
    };
    setHomepageData(prev => ({
      ...prev,
      modules: [...prev.modules, newModule]
    }));
  };

  const getDefaultContent = (type: HomepageModule['type']) => {
    switch (type) {
      case 'title':
        return { text: 'New Title', size: 'large' };
      case 'description':
        return { text: 'Add your description here...' };
      case 'image':
        return { url: '', caption: '' };
      case 'collage':
        return { images: [], layout: 'grid' };
      case 'video':
        return { url: '', title: '' };
      case 'list':
        return { items: ['List item 1', 'List item 2'], style: 'bullets' };
      default:
        return {};
    }
  };

  const updateModule = (moduleId: string, content: any) => {
    setHomepageData(prev => ({
      ...prev,
      modules: prev.modules.map(module =>
        module.id === moduleId ? { ...module, content } : module
      )
    }));
  };

  // Helper to save just the modules array to Supabase
  const saveHomepageModules = async (modules: HomepageModule[]) => {
    if (!eventId || !companyId) return;
    try {
      await supabase
        .from('event_homepage_data')
        .upsert({
          event_id: eventId,
          company_id: companyId,
          event_image: homepageData.eventImage,
          welcome_title: homepageData.welcomeTitle,
          welcome_description: homepageData.welcomeDescription,
          modules,
          event_image_offset_y: imageOffsetY,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'event_id,company_id'
        });
    } catch (error) {
      console.error('Error saving modules:', error);
    }
  };

  const removeModule = (moduleId: string) => {
    setHomepageData(prev => {
      const newModules = prev.modules.filter(module => module.id !== moduleId);
      // Persist the change to Supabase
      saveHomepageModules(newModules);
      return {
        ...prev,
        modules: newModules
      };
    });
  };

  const moveModule = (moduleId: string, direction: 'up' | 'down') => {
    setHomepageData(prev => {
      const modules = [...prev.modules];
      const index = modules.findIndex(m => m.id === moduleId);
      if (direction === 'up' && index > 0) {
        [modules[index], modules[index - 1]] = [modules[index - 1], modules[index]];
      } else if (direction === 'down' && index < modules.length - 1) {
        [modules[index], modules[index + 1]] = [modules[index + 1], modules[index]];
      }
      return { ...prev, modules };
    });
  };

  // --- Styling helpers ---
  const getMainBg = () => (isDark ? '#121212' : '#f8f9fa');
  const getGlassStyles = (isDark: boolean) => ({
    background: isDark 
      ? 'rgba(255, 255, 255, 0.05)' 
      : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)'}`,
    borderRadius: '16px',
    boxShadow: isDark 
      ? '0 8px 32px rgba(0, 0, 0, 0.3)' 
      : '0 8px 32px rgba(0, 0, 0, 0.1)'
  });
  const getButtonStyles = (variant: 'primary' | 'secondary', isDark: boolean) => {
    const base = {
      border: 'none',
      borderRadius: 8,
      padding: '10px 0',
      width: 140,
      fontSize: 16,
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      height: 44,
      letterSpacing: 0.2
    };
    if (variant === 'primary') {
      return {
        ...base,
        background: isDark ? '#fff' : '#000',
        color: isDark ? '#000' : '#fff',
      };
    } else {
      return {
        ...base,
        background: 'none',
        color: isDark ? '#fff' : '#000',
        border: `1.5px solid ${isDark ? '#444' : '#bbb'}`,
      };
    }
  };
  const getFieldStyles = (isDark: boolean) => ({
    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
    borderRadius: 8,
    padding: 16,
    color: isDark ? '#fff' : '#000',
    fontSize: 16,
    outline: 'none',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    marginBottom: 0
  });

  // --- Event Image (Cover Photo) ---
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && eventId) {
      // Enforce 15 image cap
      const totalImages = countTotalImages(file, moduleImageFiles, collageImageFiles, homepageData);
      if (totalImages > 15) {
        alert('You can only add up to 15 images per event homepage.');
        return;
      }
      // Validate file before accepting
      const validationError = validateImageFile(file);
      if (validationError) {
        alert(validationError);
        return;
      }
      setCoverImageFile(file);
      setCoverImagePreview(URL.createObjectURL(file));
      setImageOffsetY(0);
    }
  };

  const handleImageContainerClick = () => {
    if (tosAcceptedForSession) { imageInputRef.current?.click(); } else { checkTOSAcceptance(() => imageInputRef.current?.click()); }
  };

  const handleImageDoubleClick = () => {
    if (coverImagePreview || homepageData.eventImage) {
      handleImageContainerClick();
    }
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (!homepageData.eventImage && !coverImagePreview) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    setStartY(e.clientY);
    setStartOffsetY(imageOffsetY);
    wasDragging.current = false;
  };
  const handleImageMouseMove = (e: MouseEvent) => {
    if (!dragging) return;
    wasDragging.current = true;
    const container = imageContainerRef.current;
    if (!container) return;
    const containerHeight = container.offsetHeight;
    const img = container.querySelector('img');
    if (!img) return;
    const imgHeight = img.naturalHeight * (container.offsetWidth / img.naturalWidth);
    const maxOffset = Math.max(0, imgHeight - containerHeight);
    let newOffset = startOffsetY + (e.clientY - startY);
    newOffset = Math.max(-maxOffset, Math.min(0, newOffset));
    setImageOffsetY(newOffset);
  };
  const handleImageMouseUp = () => {
    setDragging(false);
    setTimeout(() => { wasDragging.current = false; }, 0);
  };
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleImageMouseMove);
      window.addEventListener('mouseup', handleImageMouseUp);
    } else {
      window.removeEventListener('mousemove', handleImageMouseMove);
      window.removeEventListener('mouseup', handleImageMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleImageMouseMove);
      window.removeEventListener('mouseup', handleImageMouseUp);
    };
  }, [dragging, startY, startOffsetY]);

  const handleImageModuleMouseDown = (e: React.MouseEvent, moduleId: string, offsetY: number = 0) => {
    console.log('MouseDown on image module', moduleId, 'offsetY:', offsetY);
    draggingImageModuleIdRef.current = moduleId;
    imageModuleStartYRef.current = e.clientY;
    imageModuleStartOffsetYRef.current = offsetY;
    window.addEventListener('mousemove', handleImageModuleMouseMove);
    window.addEventListener('mouseup', handleImageModuleMouseUp);
  };

  const handleImageModuleMouseMove = (e: MouseEvent) => {
    const moduleId = draggingImageModuleIdRef.current;
    if (!moduleId) return;
    const module = homepageData.modules.find(m => m.id === moduleId);
    if (!module || module.type !== 'image') return;
    const container = document.getElementById(`image-module-container-${moduleId}`);
    const img = document.getElementById(`image-module-img-${moduleId}`) as HTMLImageElement | null;
    if (!container || !img) return;
    const containerHeight = container.offsetHeight;
    const imgHeight = img.naturalHeight * (container.offsetWidth / img.naturalWidth);
    let maxOffset = Math.max(0, imgHeight - containerHeight);
    // Allow a minimum drag range of 40px for feedback
    if (maxOffset < 40) maxOffset = 40;
    let newOffset = imageModuleStartOffsetYRef.current + (e.clientY - imageModuleStartYRef.current);
    newOffset = Math.max(-maxOffset, Math.min(0, newOffset));
    console.log('handleMove called', { containerHeight, imgHeight, maxOffset, newOffset, module });
    updateModule(module.id, { ...module.content, offsetY: newOffset });
  };

  const handleImageModuleMouseUp = () => {
    console.log('MouseUp on image module', draggingImageModuleIdRef.current);
    draggingImageModuleIdRef.current = null;
    window.removeEventListener('mousemove', handleImageModuleMouseMove);
    window.removeEventListener('mouseup', handleImageModuleMouseUp);
  };

  // --- Module Renderers ---
  const renderModule = (module: HomepageModule) => {
    switch (module.type) {
      case 'title':
        return (
          <div style={{
            position: 'relative',
            ...getGlassStyles(isDark),
            padding: 32,
            paddingTop: 80,
            borderRadius: 16,
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.1)',
            minHeight: 120,
          }}>
            <div style={{
              position: 'absolute',
              top: 16,
              right: 24,
              display: 'flex',
              gap: 8,
              zIndex: 2,
              background: 'none',
              pointerEvents: 'auto',
            }}>
              <button
                onClick={() => moveModule(module.id, 'up')}
                style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)', border: '1.5px solid #bbb', borderRadius: 8, color: isDark ? '#fff' : '#222', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 1px 4px #0001', transition: 'border 0.2s, background 0.2s' }} title="Move module up">↑</button>
              <button
                onClick={() => moveModule(module.id, 'down')}
                style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)', border: '1.5px solid #bbb', borderRadius: 8, color: isDark ? '#fff' : '#222', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 1px 4px #0001', transition: 'border 0.2s, background 0.2s' }} title="Move module down">↓</button>
              <button
                onClick={() => removeModule(module.id)}
                style={{ background: isDark ? 'rgba(255,0,0,0.08)' : 'rgba(255,0,0,0.04)', border: '1.5px solid #ef4444', borderRadius: 8, color: '#ef4444', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 1px 4px #0001', transition: 'border 0.2s, background 0.2s' }} title="Delete module">×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 18, letterSpacing: 1, color: isDark ? '#fff' : '#222' }}>Title</div>
              <input
                type="text"
                value={module.content.text}
                onChange={(e) => updateModule(module.id, { ...module.content, text: e.target.value })}
                style={{
                  width: '100%',
                  ...getFieldStyles(isDark),
                  fontSize: module.content.size === 'large' ? 24 : 18,
                  fontWeight: 700,
                  padding: 16
                }}
                placeholder="Enter title..."
                onFocus={(e) => {
                  e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
                  e.target.style.background = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
                  e.target.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)';
                }}
                className="ehb-placeholder"
              />
            </div>
          </div>
        );
      case 'description':
        return (
          <div style={{
            position: 'relative',
            ...getGlassStyles(isDark),
            padding: 32,
            paddingTop: 80,
            borderRadius: 16,
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.1)',
            minHeight: 120,
          }}>
            <div style={{
              position: 'absolute',
              top: 16,
              right: 24,
              display: 'flex',
              gap: 8,
              zIndex: 2,
              background: 'none',
              pointerEvents: 'auto',
            }}>
              <button
                onClick={() => moveModule(module.id, 'up')}
                style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)', border: '1.5px solid #bbb', borderRadius: 8, color: isDark ? '#fff' : '#222', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 1px 4px #0001', transition: 'border 0.2s, background 0.2s' }} title="Move module up">↑</button>
              <button
                onClick={() => moveModule(module.id, 'down')}
                style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)', border: '1.5px solid #bbb', borderRadius: 8, color: isDark ? '#fff' : '#222', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 1px 4px #0001', transition: 'border 0.2s, background 0.2s' }} title="Move module down">↓</button>
              <button
                onClick={() => removeModule(module.id)}
                style={{ background: isDark ? 'rgba(255,0,0,0.08)' : 'rgba(255,0,0,0.04)', border: '1.5px solid #ef4444', borderRadius: 8, color: '#ef4444', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 1px 4px #0001', transition: 'border 0.2s, background 0.2s' }} title="Delete module">×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 18, letterSpacing: 1, color: isDark ? '#fff' : '#222' }}>Description</div>
              <textarea
                value={module.content.text}
                onChange={(e) => updateModule(module.id, { ...module.content, text: e.target.value })}
                style={{
                  width: '100%',
                  minHeight: 100,
                  ...getFieldStyles(isDark),
                  resize: 'vertical',
                  lineHeight: 1.5
                }}
                placeholder="Enter description..."
                onFocus={(e) => {
                  e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
                  e.target.style.background = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
                  e.target.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)';
                }}
                className="ehb-placeholder"
              />
            </div>
          </div>
        );
      case 'image':
        return (
          <div
            id={`image-module-container-${module.id}`}
            style={{
              position: 'relative',
              ...getGlassStyles(isDark),
              padding: 0,
              borderRadius: 16,
              boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.1)',
              minHeight: 0,
              height: 320,
              overflow: 'hidden',
              marginBottom: 40,
            }}
          >
            <div style={{
              position: 'absolute',
              top: 16,
              right: 24,
              display: 'flex',
              gap: 8,
              zIndex: 2,
              background: 'none',
              pointerEvents: 'auto',
            }}>
              <button
                onClick={() => moveModule(module.id, 'up')}
                style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)', border: '1.5px solid #bbb', borderRadius: 8, color: isDark ? '#fff' : '#222', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 1px 4px #0001', transition: 'border 0.2s, background 0.2s' }} title="Move module up">↑</button>
              <button
                onClick={() => moveModule(module.id, 'down')}
                style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)', border: '1.5px solid #bbb', borderRadius: 8, color: isDark ? '#fff' : '#222', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 1px 4px #0001', transition: 'border 0.2s, background 0.2s' }} title="Move module down">↓</button>
              <button
                onClick={() => removeModule(module.id)}
                style={{ background: isDark ? 'rgba(255,0,0,0.08)' : 'rgba(255,0,0,0.04)', border: '1.5px solid #ef4444', borderRadius: 8, color: '#ef4444', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 1px 4px #0001', transition: 'border 0.2s, background 0.2s' }} title="Delete module">×</button>
            </div>
            {module.content.url ? (
              <img
                id={`image-module-img-${module.id}`}
                src={module.content.url}
                alt="Preview"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: module.content.offsetY || 0,
                  width: '100%',
                  height: 'auto',
                  minHeight: '100%',
                  minWidth: '100%',
                  objectFit: 'cover',
                  borderRadius: 16,
                  display: 'block',
                  cursor: 'grab',
                  userSelect: 'none',
                  zIndex: 1,
                  transition: draggingImageModuleId === module.id ? 'none' : 'top 0.2s',
                }}
                draggable={false}
                onMouseDown={e => handleImageModuleMouseDown(e, module.id, module.content.offsetY || 0)}
                onLoad={e => {
                  const img = e.currentTarget;
                  console.log('Image loaded', { naturalHeight: img.naturalHeight, naturalWidth: img.naturalWidth });
                }}
              />
            ) : (
              <div
                onClick={() => checkTOSAcceptance(() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/jpeg,image/png,image/webp';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      // Enforce 15 image cap
                      const totalImages = countTotalImages(coverImageFile, [...moduleImageFiles, file], collageImageFiles, homepageData);
                      if (totalImages > 15) {
                        alert('You can only add up to 15 images per event homepage.');
                        return;
                      }
                      // Validate file before accepting
                      const validationError = validateImageFile(file);
                      if (validationError) {
                        alert(validationError);
                        return;
                      }
                      
                      // Create a preview URL for immediate display
                      const previewUrl = URL.createObjectURL(file);
                      updateModule(module.id, { ...module.content, url: previewUrl });
                      // Store the file for later upload
                      setModuleImageFiles(prev => [...prev, file]);
                    }
                  };
                  input.click();
                })}
                style={{
                  width: '100%',
                  height: 320,
                  border: isDark ? '2.5px dashed #fff' : '2.5px dashed #bbb',
                  borderRadius: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isDark ? '#fff' : '#222',
                  fontSize: 20,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: getGlassStyles(isDark).background,
                  textAlign: 'center',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 8 }}>Upload Image</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>JPEG, PNG, WebP • Max 2MB</div>
              </div>
            )}
            {/* Drag overlay feedback for image module */}
            {draggingImageModuleId === module.id && (
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0,0,0,0.08)',
                border: '2px dashed #fff',
                borderRadius: 16,
                zIndex: 2,
                pointerEvents: 'none',
                transition: 'background 0.2s',
              }} />
            )}
          </div>
        );
      case 'video':
        return (
          <div style={{
            position: 'relative',
            ...getGlassStyles(isDark),
            padding: 32,
            paddingTop: 80,
            borderRadius: 16,
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.1)',
            minHeight: 120,
          }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 18, letterSpacing: 1, color: isDark ? '#fff' : '#222' }}>Video</div>
            {/* Module-level controls (fixed top right) */}
            <div style={{
              position: 'absolute',
              top: 16,
              right: 24,
              display: 'flex',
              gap: 8,
              zIndex: 2,
              background: 'none',
              pointerEvents: 'auto',
            }}>
              <button onClick={() => moveModule(module.id, 'up')} style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)', border: '1.5px solid #bbb', borderRadius: 8, color: isDark ? '#fff' : '#222', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 1px 4px #0001', transition: 'border 0.2s, background 0.2s' }} title="Move module up">↑</button>
              <button onClick={() => moveModule(module.id, 'down')} style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)', border: '1.5px solid #bbb', borderRadius: 8, color: isDark ? '#fff' : '#222', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 1px 4px #0001', transition: 'border 0.2s, background 0.2s' }} title="Move module down">↓</button>
              <button onClick={() => removeModule(module.id)} style={{ background: isDark ? 'rgba(255,0,0,0.08)' : 'rgba(255,0,0,0.04)', border: '1.5px solid #ef4444', borderRadius: 8, color: '#ef4444', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 1px 4px #0001', transition: 'border 0.2s, background 0.2s' }} title="Delete module">×</button>
            </div>
            <input
              type="url"
              value={module.content.url}
              onChange={(e) => updateModule(module.id, { ...module.content, url: e.target.value })}
              placeholder="Paste YouTube or Vimeo URL here..."
              style={{
                width: '100%',
                marginBottom: 18,
                ...getFieldStyles(isDark),
                fontSize: 18,
                padding: 16,
              }}
            />
            {/* Video preview if valid URL */}
            {module.content.url && (module.content.url.includes('youtube.com') || module.content.url.includes('youtu.be')) && (
              <div style={{
                marginTop: 40,
                width: 960,
                height: 540,
                maxWidth: '100%',
                margin: '40px auto 0 auto',
                borderRadius: 12,
                overflow: 'hidden',
                background: '#000',
                position: 'relative',
              }}>
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${module.content.url.split('v=')[1]?.split('&')[0] || module.content.url.split('/').pop()}`}
                  title="YouTube video preview"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', width: '120%', height: '120%', left: '-10%', top: '-10%', border: 'none' }}
                />
              </div>
            )}
            {module.content.url && module.content.url.includes('vimeo.com') && (
              <div style={{ width: '100%', maxWidth: 480, aspectRatio: '16/9', margin: '0 auto', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px #0001', background: '#000' }}>
                <iframe
                  src={`https://player.vimeo.com/video/${module.content.url.split('/').pop()}`}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title="Vimeo video preview"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              </div>
            )}
          </div>
        );
      case 'list':
        return (
          <div style={{
            position: 'relative',
            ...getGlassStyles(isDark),
            padding: 32,
            paddingTop: 80,
            borderRadius: 16,
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.1)',
            minHeight: 120,
          }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 18, letterSpacing: 1, color: isDark ? '#fff' : '#222' }}>List</div>
            {/* Module-level controls (fixed top right) */}
            <div style={{
              position: 'absolute',
              top: 16,
              right: 24,
              display: 'flex',
              gap: 8,
              zIndex: 2,
              background: 'none',
              pointerEvents: 'auto',
            }}>
              <button
                onClick={() => moveModule(module.id, 'up')}
                style={{
                  background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)',
                  border: '1.5px solid #bbb',
                  borderRadius: 8,
                  color: isDark ? '#fff' : '#222',
                  width: 36,
                  height: 36,
                  fontSize: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  boxShadow: '0 1px 4px #0001',
                  transition: 'border 0.2s, background 0.2s',
                }}
                title="Move module up"
              >↑</button>
              <button
                onClick={() => moveModule(module.id, 'down')}
                style={{
                  background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)',
                  border: '1.5px solid #bbb',
                  borderRadius: 8,
                  color: isDark ? '#fff' : '#222',
                  width: 36,
                  height: 36,
                  fontSize: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  boxShadow: '0 1px 4px #0001',
                  transition: 'border 0.2s, background 0.2s',
                }}
                title="Move module down"
              >↓</button>
              <button
                onClick={() => removeModule(module.id)}
                style={{
                  background: isDark ? 'rgba(255,0,0,0.08)' : 'rgba(255,0,0,0.04)',
                  border: '1.5px solid #ef4444',
                  borderRadius: 8,
                  color: '#ef4444',
                  width: 36,
                  height: 36,
                  fontSize: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  boxShadow: '0 1px 4px #0001',
                  transition: 'border 0.2s, background 0.2s',
                }}
                title="Delete module"
              >×</button>
            </div>
            {/* List items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
              {module.content.items.map((item: string, index: number) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const newItems = [...module.content.items];
                      newItems[index] = e.target.value;
                      updateModule(module.id, { ...module.content, items: newItems });
                    }}
                    style={{
                      flex: 1,
                      height: 48,
                      fontSize: 18,
                      padding: '14px 16px',
                      borderRadius: 10,
                      border: '1.5px solid #bbb',
                      background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
                      color: isDark ? '#fff' : '#222',
                      outline: 'none',
                      fontWeight: 500,
                      transition: 'border 0.2s',
                    }}
                    onFocus={e => e.target.style.border = '1.5px solid #3b82f6'}
                    onBlur={e => e.target.style.border = '1.5px solid #bbb'}
                  />
                  <button
                    onClick={() => {
                      const newItems = module.content.items.filter((_: any, i: number) => i !== index);
                      updateModule(module.id, { ...module.content, items: newItems });
                    }}
                    style={{
                      background: isDark ? 'rgba(255,0,0,0.08)' : 'rgba(255,0,0,0.04)',
                      border: '1.5px solid #ef4444',
                      borderRadius: 8,
                      color: '#ef4444',
                      width: 48,
                      height: 48,
                      fontSize: 18,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      boxShadow: '0 1px 4px #0001',
                      transition: 'border 0.2s, background 0.2s',
                    }}
                    title="Delete item"
                  >×</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                onClick={() => {
                  const newItems = [...module.content.items, 'New item'];
                  updateModule(module.id, { ...module.content, items: newItems });
                }}
                style={{
                  background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)',
                  border: '1.5px solid #bbb',
                  color: isDark ? '#fff' : '#222',
                  padding: '12px 32px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 600,
                  boxShadow: '0 1px 4px #0001',
                  transition: 'border 0.2s, background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.border = '1.5px solid #3b82f6'}
                onMouseLeave={e => e.currentTarget.style.border = '1.5px solid #bbb'}
              >
                + Add item
              </button>
            </div>
          </div>
        );
      case 'collage':
        return (
          <div style={{
            position: 'relative',
            ...getGlassStyles(isDark),
            padding: 32,
            paddingTop: 80,
            borderRadius: 16,
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.1)',
            minHeight: 120,
          }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 18, letterSpacing: 1, color: isDark ? '#fff' : '#222' }}>Image Collage</div>
            {/* Module-level controls (fixed top right) */}
            <div style={{
              position: 'absolute',
              top: 16,
              right: 24,
              display: 'flex',
              gap: 8,
              zIndex: 2,
              background: 'none',
              pointerEvents: 'auto',
            }}>
              <button onClick={() => moveModule(module.id, 'up')} style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)', border: '1.5px solid #bbb', borderRadius: 8, color: isDark ? '#fff' : '#222', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 1px 4px #0001', transition: 'border 0.2s, background 0.2s' }} title="Move module up">↑</button>
              <button onClick={() => moveModule(module.id, 'down')} style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)', border: '1.5px solid #bbb', borderRadius: 8, color: isDark ? '#fff' : '#222', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 1px 4px #0001', transition: 'border 0.2s, background 0.2s' }} title="Move module down">↓</button>
              <button onClick={() => removeModule(module.id)} style={{ background: isDark ? 'rgba(255,0,0,0.08)' : 'rgba(255,0,0,0.04)', border: '1.5px solid #ef4444', borderRadius: 8, color: '#ef4444', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 1px 4px #0001', transition: 'border 0.2s, background 0.2s' }} title="Delete module">×</button>
            </div>
            {/* Collage preview or upload field */}
            {module.content.images && module.content.images.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <CollagePreviewInline images={module.content.images} layout={LAYOUTS.find(l => l.id === module.content.layout) || LAYOUTS[0]} isDark={isDark} size={342} />
              </div>
            ) : (
              <div
                onClick={() => checkTOSAcceptance(() => {
                  setEditingCollageModuleId(module.id);
                  setCollageModalOpen(true);
                })}
                style={{
                  width: '100%',
                  height: 120,
                  border: isDark ? '2.5px dashed #fff' : '2.5px dashed #bbb',
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isDark ? '#fff' : '#222',
                  fontSize: 20,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: getGlassStyles(isDark).background,
                  textAlign: 'center',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ fontSize: 16, marginBottom: 4 }}>Create Image Collage</div>
                <div style={{ fontSize: 10, opacity: 0.8 }}>Up to 6 images • Max 2MB each</div>
              </div>
            )}
            {/* Thumbnails below preview if images exist */}
            {module.content.images && module.content.images.length > 0 && (
              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                {module.content.images.slice(0, 4).map((src: string, idx: number) => (
                  <img key={idx} src={src} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1.5px solid #bbb' }} />
                ))}
                {module.content.images.length > 4 && (
                  <span style={{ color: '#888', fontSize: 18, marginLeft: 8 }}>+{module.content.images.length - 4} more</span>
                )}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Helper: CollagePreview for inline module preview
  function CollagePreviewInline({ images, layout, isDark, size = 180 }: { images: string[]; layout: any; isDark: boolean; size?: number }) {
    const gap = 8;
    const slots = layout.slots;
    return (
      <div style={{ width: size, height: size, position: 'relative', background: isDark ? '#18191b' : '#f8f9fa', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px #0001' }}>
        {slots.map((slot: any, idx: number) => {
          const left = slot.left * size + (slot.left > 0 ? gap / 2 : 0);
          const top = slot.top * size + (slot.top > 0 ? gap / 2 : 0);
          const width = slot.width * size - (slot.left > 0 ? gap / 2 : 0) - (slot.left + slot.width < 1 ? gap / 2 : 0);
          const height = slot.height * size - (slot.top > 0 ? gap / 2 : 0) - (slot.top + slot.height < 1 ? gap / 2 : 0);
          let borderRadius = '';
          if (slot.left === 0 && slot.top === 0) borderRadius = '12px 0 0 0';
          if (slot.left + slot.width === 1 && slot.top === 0) borderRadius = '0 12px 0 0';
          if (slot.left === 0 && slot.top + slot.height === 1) borderRadius = '0 0 0 12px';
          if (slot.left + slot.width === 1 && slot.top + slot.height === 1) borderRadius = '0 0 12px 0';
          return (
            <div key={idx} style={{ position: 'absolute', left, top, width, height, background: '#fff', borderRadius, overflow: 'hidden', boxSizing: 'border-box' }}>
              {images && images[idx] && (
                <img src={images[idx]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 0, display: 'block' }} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Helper to check/store TOS acceptance
  const checkTOSAcceptance = async (cb: () => void) => {
    if (tosAcceptedForSession) {
      cb();
      return;
    }
    const user = await getCurrentUser();
    setTosModalCallback(() => async () => {
      if (user) {
        await supabase.from('tos_acceptance').upsert({ user_id: user.id, user_name: user.name, user_email: user.email, accepted_at: new Date().toISOString(), tos_version: 1 });
      }
      setTosAcceptedForSession(true);
      setTosModalOpen(false);
      setTimeout(cb, 200); // Ensure modal closes before callback
    });
    setTosModalOpen(true);
  };

  // Add PreviewModal component inside EventHomepageBuilderPage
  function PreviewModal({ open, onClose, homepageData, isDark }: { open: boolean; onClose: () => void; homepageData: HomepageData; isDark: boolean }) {
    if (!open) return null;
    const coverImageSrc = coverImagePreview || homepageData.eventImage || '';
    const modalHeight = 844;
    const coverHeight = Math.round(modalHeight / 3);
    const moduleGap = 19;
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 3000,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* X button at top right of desktop modal overlay */}
        <button onClick={onClose} style={{ position: 'fixed', top: 32, right: 48, zIndex: 4000, background: 'rgba(0,0,0,0.12)', color: '#fff', border: 'none', borderRadius: 8, width: 44, height: 44, fontSize: 28, cursor: 'pointer', fontWeight: 700, boxShadow: '0 2px 12px #0004' }}>×</button>
        <div style={{
          width: 390, height: modalHeight, background: isDark ? '#18191b' : '#fff', borderRadius: 32, boxShadow: '0 8px 32px #0008', position: 'relative',
          display: 'flex', flexDirection: 'column', padding: 0, border: isDark ? '1.5px solid #333' : '1.5px solid #eee',
          overflow: 'hidden', // ensure nothing overflows outside the modal
        }}>
          {/* Scrollable content including cover photo */}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: bottomGapPx }}>
            {/* Event image - at the very top, scrolls with content */}
            {coverImageSrc && (
              <div style={{
                width: '100%',
                height: coverHeight,
                overflow: 'hidden',
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                borderBottomLeftRadius: 30,
                borderBottomRightRadius: 30,
                borderRadius: '0 0 30px 30px',
                clipPath: 'inset(0 0 0 0 round 0 0 30px 30px)',
                WebkitClipPath: 'inset(0 0 0 0 round 0 0 30px 30px)',
                background: '#f00',
                boxShadow: 'inset 0 -60px 60px -10px rgba(0,0,0,0.55), inset 0 -12px 24px -2px rgba(0,0,0,0.45)',
                position: 'relative',
              }}>
                <img
                  src={coverImageSrc}
                  alt="Event Cover"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block',
                    background: '#f00',
                  }}
                  draggable={false}
                />
              </div>
            )}
            <div style={{ height: bottomGapPx }} />
            <div style={{ padding: '0 24px 0 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* Main welcome title, styled as a title */}
              <div style={{ fontSize: 24, fontWeight: 700, color: isDark ? '#fff' : '#222', lineHeight: 1.2 }}>{homepageData.welcomeTitle}</div>
              <div style={{ height: moduleGap }} />
              <div style={{ fontSize: 16, fontWeight: 400, color: isDark ? '#ccc' : '#444', lineHeight: 1.5 }}>{homepageData.welcomeDescription}</div>
              {/* Render all module types */}
              {homepageData.modules && homepageData.modules.map((module, idx) => {
                const isTitle = module.type === 'title';
                return (
                  <React.Fragment key={module.id}>
                    {isTitle && <div style={{ height: gapPx }} />}
                    <div>
                      {module.type === 'title' && (
                        <div style={{ fontSize: 24, fontWeight: 700, color: isDark ? '#fff' : '#222', lineHeight: 1.2 }}>{module.content.text}</div>
                      )}
                      {module.type === 'description' && (
                        <div style={{ fontSize: 16, fontWeight: 400, color: isDark ? '#ccc' : '#444', lineHeight: 1.5 }}>{module.content.text}</div>
                      )}
                      {module.type === 'image' && module.content.url && (
                        <div style={{
                          width: '100%',
                          maxHeight: 220,
                          borderRadius: 16,
                          overflow: 'hidden',
                          boxShadow: 'inset 0 -40px 40px -10px rgba(0,0,0,0.45), inset 0 -8px 16px -2px rgba(0,0,0,0.32)',
                          margin: '16px 0',
                          position: 'relative',
                        }}>
                          <img src={module.content.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#f00' }} />
                        </div>
                      )}
                      {module.type === 'collage' && module.content.images && module.content.images.length > 0 && (
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto' }}>
                          <CollagePreviewInline images={module.content.images} layout={LAYOUTS.find(l => l.id === module.content.layout) || LAYOUTS[0]} isDark={isDark} size={342} />
                        </div>
                      )}
                      {module.type === 'video' && module.content.url && (
                        <div style={{
                          position: 'relative',
                          left: '50%',
                          width: '100vw',
                          maxWidth: 390,
                          transform: 'translateX(-50%)',
                          aspectRatio: '16/9',
                          borderRadius: 14,
                          overflow: 'hidden',
                          background: '#000',
                          marginBottom: 0,
                        }}>
                          <iframe
                            src={module.content.url.includes('youtube.com') || module.content.url.includes('youtu.be')
                              ? `https://www.youtube.com/embed/${module.content.url.split('v=')[1]?.split('&')[0] || module.content.url.split('/').pop()}`
                              : module.content.url.includes('vimeo.com')
                              ? `https://player.vimeo.com/video/${module.content.url.split('/').pop()}`
                              : ''}
                            width="100%" height="100%" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title="Video preview"
                            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                          />
                        </div>
                      )}
                      {module.type === 'list' && module.content.items && (
                        <ul style={{ paddingLeft: 0, margin: 0, listStyle: 'none' }}>
                          {module.content.items.map((item: string, i: number) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'center', fontSize: 16, color: isDark ? '#fff' : '#222', paddingBottom: 4, marginBottom: 10 }}>
                              <span style={{ display: 'inline-block', width: 10, height: 10, background: isDark ? '#fff' : '#222', borderRadius: 2, marginRight: 12, flexShrink: 0 }}></span>
                              <span style={{ whiteSpace: 'pre-line' }}>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {isTitle && <div style={{ height: gapPx }} />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Render ---
  return (
    <div style={{
      minHeight: '100vh',
      background: getMainBg(),
      color: isDark ? '#fff' : '#000',
      padding: '48px 24px',
    }}>
      {/* Success Toast */}
      {showSuccessToast && (
        <div style={{
          position: 'fixed',
          top: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#222',
          color: '#fff',
          borderRadius: 12,
          boxShadow: '0 4px 24px #0006',
          padding: '18px 36px 18px 24px',
          fontSize: 18,
          fontWeight: 600,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          minWidth: 320,
          maxWidth: '90vw',
        }}>
          <span style={{ marginRight: 18, fontSize: 22 }}>✅</span>
          Homepage saved successfully!
          <div style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            height: 4,
            width: '100%',
            background: 'rgba(0,255,100,0.18)',
            borderRadius: '0 0 12px 12px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: '100%',
              background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
              animation: 'homepage-toast-timer 3s linear forwards',
            }} />
          </div>
          <style>{`
            @keyframes homepage-toast-timer {
              from { width: 100%; }
              to { width: 0%; }
            }
          `}</style>
        </div>
      )}
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ ...getButtonStyles('secondary', isDark) }}
          >
            Back
          </button>
          <div style={{ display: 'flex', gap: 16 }}>
            <button
              onClick={() => setPreviewOpen(true)}
              style={{ ...getButtonStyles('secondary', isDark) }}
            >
              Preview
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{ ...getButtonStyles('primary', isDark) }}
            >
              {hasSavedOnce ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 40px 0', letterSpacing: 1 }}>
          Event Homepage Builder
        </h1>

        {/* Event Cover Image */}
        <div
          ref={imageContainerRef}
          style={{
            width: '100%',
            height: 320,
            borderRadius: 24,
            background: getGlassStyles(isDark).background,
            marginBottom: 40,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: isDark
              ? '0 4px 32px rgba(0,0,0,0.4)'
              : '0 4px 32px rgba(0,0,0,0.08)',
            userSelect: dragging ? 'none' : 'auto',
            cursor: !homepageData.eventImage && !coverImagePreview ? 'pointer' : 'default',
          }}
          onClick={!homepageData.eventImage && !coverImagePreview ? handleImageContainerClick : undefined}
          onDoubleClick={handleImageDoubleClick}
        >
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleImageChange}
          />
          {coverImagePreview ? (
            <img
              src={coverImagePreview}
              alt="Event Cover"
              style={{
                position: 'absolute',
                left: 0,
                top: imageOffsetY,
                width: '100%',
                height: 'auto',
                minHeight: '100%',
                minWidth: '100%',
                objectFit: 'cover',
                cursor: 'grab',
                userSelect: 'none',
                zIndex: 1,
                transition: dragging ? 'none' : 'top 0.2s',
              }}
              draggable={false}
              onMouseDown={handleImageMouseDown}
            />
          ) : homepageData.eventImage ? (
            <img
              src={homepageData.eventImage}
              alt="Event Cover"
              style={{
                position: 'absolute',
                left: 0,
                top: imageOffsetY,
                width: '100%',
                height: 'auto',
                minHeight: '100%',
                minWidth: '100%',
                objectFit: 'cover',
                cursor: 'grab',
                userSelect: 'none',
                zIndex: 1,
                transition: dragging ? 'none' : 'top 0.2s',
              }}
              draggable={false}
              onMouseDown={handleImageMouseDown}
            />
          ) : (
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#aaa' : '#888',
              fontSize: 48,
              fontWeight: 700,
              zIndex: 1,
              pointerEvents: 'none',
              letterSpacing: 1,
              background: isDark ? 'rgba(30,32,38,0.85)' : 'rgba(255,255,255,0.85)',
            }}>
              <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Event Cover Photo</div>
              <div style={{ fontSize: 14, fontWeight: 400, opacity: 0.8, textAlign: 'center', maxWidth: 200 }}>
                Click to upload • JPEG, PNG, WebP • Max 2MB
              </div>
            </div>
          )}
          {/* Change Image Button - Only show when image exists */}
          {(coverImagePreview || homepageData.eventImage) && (
            <button
              onClick={handleImageContainerClick}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                border: '2px dashed #fff',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                zIndex: 3,
                backdropFilter: 'blur(10px)',
                transition: 'background 0.2s',
                opacity: 0,
                pointerEvents: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.8)';
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.7)';
                e.currentTarget.style.opacity = '0';
              }}
            >
              Change Image
            </button>
          )}
          {/* Drag overlay feedback */}
          {dragging && (
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.08)',
              border: '2px dashed #fff',
              borderRadius: 24,
              zIndex: 2,
              pointerEvents: 'none',
              transition: 'background 0.2s',
            }} />
          )}
        </div>

        {/* Usage Instructions */}
        <div style={{
          textAlign: 'center',
          marginTop: -32,
          marginBottom: 40,
          fontSize: 12,
          color: isDark ? '#888' : '#666',
          fontStyle: 'italic',
        }}>
          {!homepageData.eventImage && !coverImagePreview ? (
            'Click to upload a cover photo for your event'
          ) : (
            'Click to upload • Drag to reposition • Double-click to change'
          )}
        </div>

        <div style={{ display: 'flex', gap: 40 }}>
          {/* Homepage Preview - Drop Zone */}
          <div style={{
            flex: 1,
            ...getGlassStyles(isDark),
            padding: 40,
            minHeight: 600,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: 32
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.style.background = isDark 
              ? 'rgba(255, 255, 255, 0.08)' 
              : 'rgba(255, 255, 255, 0.9)';
          }}
          onDragLeave={(e) => {
            e.currentTarget.style.background = isDark 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(255, 255, 255, 0.8)';
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.background = isDark 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(255, 255, 255, 0.8)';
            const moduleType = e.dataTransfer.getData('text/plain') as HomepageModule['type'];
            if (moduleType) {
              addModule(moduleType);
            }
          }}>
            {/* Editable Welcome Section */}
            <div style={{ marginBottom: 40, borderBottom: `2px solid ${isDark ? '#333' : '#eee'}`, paddingBottom: 32 }}>
              {isEditing.title ? (
                <input
                  type="text"
                  value={homepageData.welcomeTitle}
                  onChange={(e) => setHomepageData(prev => ({ ...prev, welcomeTitle: e.target.value }))}
                  onBlur={() => setIsEditing(prev => ({ ...prev, title: false }))}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditing(prev => ({ ...prev, title: false }))}
                  autoFocus
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    fontSize: 32,
                    fontWeight: 800,
                    color: isDark ? '#fff' : '#000',
                    outline: 'none',
                    marginBottom: 16
                  }}
                />
              ) : (
                <h1
                  onClick={() => setIsEditing(prev => ({ ...prev, title: true }))}
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: isDark ? '#fff' : '#000',
                    margin: '0 0 16px 0',
                    cursor: 'pointer',
                    padding: 4,
                    borderRadius: 4,
                    border: '2px dashed transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.border = `2px dashed ${isDark ? '#666' : '#ccc'}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.border = '2px dashed transparent';
                  }}
                >
                  {homepageData.welcomeTitle}
                </h1>
              )}

              {isEditing.description ? (
                <textarea
                  value={homepageData.welcomeDescription}
                  onChange={(e) => setHomepageData(prev => ({ ...prev, welcomeDescription: e.target.value }))}
                  onBlur={() => setIsEditing(prev => ({ ...prev, description: false }))}
                  autoFocus
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    fontSize: 16,
                    color: isDark ? '#ccc' : '#666',
                    outline: 'none',
                    minHeight: 60,
                    resize: 'vertical'
                  }}
                />
              ) : (
                <p
                  onClick={() => setIsEditing(prev => ({ ...prev, description: true }))}
                  style={{
                    fontSize: 16,
                    color: isDark ? '#ccc' : '#666',
                    margin: 0,
                    cursor: 'pointer',
                    padding: 4,
                    borderRadius: 4,
                    border: '2px dashed transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.border = `2px dashed ${isDark ? '#666' : '#ccc'}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.border = '2px dashed transparent';
                  }}
                >
                  {homepageData.welcomeDescription}
                </p>
              )}
            </div>

            {/* Dynamic Modules */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
              {homepageData.modules.map((module, index) => (
                <div
                  key={module.id}
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    borderRadius: 12,
                    padding: 24,
                    position: 'relative',
                    marginBottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20
                  }}
                >
                  <div style={{ marginTop: 0 }}>
                    {renderModule(module)}
                  </div>
                </div>
              ))}

              {homepageData.modules.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: 60,
                  color: isDark ? '#666' : '#999',
                  fontSize: 16,
                  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                  border: `2px dashed ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
                  borderRadius: 12,
                  margin: '20px 0'
                }}>
                  <div style={{ fontSize: 24, marginBottom: 12 }}>📋</div>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Start Building Your Homepage</div>
                  <div style={{ fontSize: 14, opacity: 0.8 }}>
                    Drag modules from the right panel or click to add
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Module Palette - Right Side */}
          <div style={{
            width: 280,
            ...getGlassStyles(isDark),
            padding: 24,
            height: 'fit-content',
            position: 'sticky',
            top: 40
          }}>
            <h3 style={{
              fontSize: 18,
              fontWeight: 600,
              marginBottom: 16,
              color: isDark ? '#fff' : '#000'
            }}>
              Add Modules
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { type: 'title' as const, label: 'Title' },
                { type: 'description' as const, label: 'Description' },
                { type: 'image' as const, label: 'Image' },
                { type: 'collage' as const, label: 'Image Collage' },
                { type: 'video' as const, label: 'Video' },
                { type: 'list' as const, label: 'List' }
              ].map((moduleType) => (
                <div
                  key={moduleType.type}
                  draggable
                  onClick={() => addModule(moduleType.type)}
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
                    borderRadius: 8,
                    padding: 16,
                    color: isDark ? '#fff' : '#000',
                    cursor: 'grab',
                    textAlign: 'center',
                    fontSize: 14,
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    userSelect: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = isDark 
                      ? '0 8px 25px rgba(255,255,255,0.1)' 
                      : '0 8px 25px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', moduleType.type);
                    e.currentTarget.style.opacity = '0.5';
                  }}
                  onDragEnd={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  {moduleType.label}
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 20,
              padding: 16,
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              borderRadius: 8,
              fontSize: 12,
              color: isDark ? '#aaa' : '#666',
              textAlign: 'center'
            }}>
              Drag modules to the left area or click to add
            </div>
          </div>
        </div>
      </div>
      {collageModalOpen && editingCollageModuleId && (
        <ImageCollageModal
          open={collageModalOpen}
          isDark={isDark}
          onClose={() => setCollageModalOpen(false)}
          onSave={({ images, imagePreviews, layout }: { images: File[]; imagePreviews: string[]; layout: string }) => {
            updateModule(editingCollageModuleId, { images: imagePreviews, layout });
            setCollageModalOpen(false);
          }}
        />
      )}
      {previewOpen && (
        <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} homepageData={homepageData} isDark={isDark} />
      )}
      <TOSModal open={tosModalOpen} onAccept={tosModalCallback || (() => setTosModalOpen(false))} onClose={() => setTosModalOpen(false)} dark={isDark} />
    </div>
  );
} 