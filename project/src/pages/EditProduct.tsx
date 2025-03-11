import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Store, ArrowLeft, Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadProductImage, uploadMultipleProductImages } from '../lib/storage';

interface ProductFormData {
  sku: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  price: string;
  stock_quantity: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  ean: string;
  warranty: string;
}

interface ImagePreview {
  file: File;
  preview: string;
  isExisting?: boolean;
  url?: string;
}

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const additionalImagesInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ProductFormData>({
    sku: '',
    name: '',
    description: '',
    brand: '',
    category: '',
    price: '',
    stock_quantity: '',
    weight: '',
    length: '',
    width: '',
    height: '',
    ean: '',
    warranty: ''
  });

  const [mainImage, setMainImage] = useState<ImagePreview | null>(null);
  const [additionalImages, setAdditionalImages] = useState<ImagePreview[]>([]);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!product) throw new Error('Product not found');

      setFormData({
        sku: product.sku,
        name: product.name,
        description: product.description || '',
        brand: product.metadata?.brand || '',
        category: product.metadata?.category || '',
        price: product.price.toString(),
        stock_quantity: product.stock_quantity.toString(),
        weight: product.metadata?.dimensions?.weight?.toString() || '',
        length: product.metadata?.dimensions?.length?.toString() || '',
        width: product.metadata?.dimensions?.width?.toString() || '',
        height: product.metadata?.dimensions?.height?.toString() || '',
        ean: product.metadata?.ean || '',
        warranty: product.metadata?.warranty?.toString() || ''
      });

      if (product.metadata?.images?.main) {
        setMainImage({
          preview: product.metadata.images.main,
          file: null as any,
          isExisting: true,
          url: product.metadata.images.main
        });
      }

      if (product.metadata?.images?.additional) {
        setAdditionalImages(
          product.metadata.images.additional.map(url => ({
            preview: url,
            file: null as any,
            isExisting: true,
            url
          }))
        );
      }
    } catch (err) {
      console.error('Error loading product:', err);
      setError('Failed to load product');
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMainImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Main image must be less than 5MB');
        return;
      }
      setMainImage({
        file,
        preview: URL.createObjectURL(file)
      });
    }
  };

  const handleAdditionalImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => file.size <= 5 * 1024 * 1024);
    
    if (validFiles.length !== files.length) {
      setError('Some images were skipped because they exceed 5MB');
    }

    const newPreviews = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setAdditionalImages(prev => [...prev, ...newPreviews]);
  };

  const removeMainImage = () => {
    if (mainImage) {
      if (!mainImage.isExisting) {
        URL.revokeObjectURL(mainImage.preview);
      }
      setMainImage(null);
    }
  };

  const removeAdditionalImage = (index: number) => {
    setAdditionalImages(prev => {
      const newImages = [...prev];
      if (!newImages[index].isExisting) {
        URL.revokeObjectURL(newImages[index].preview);
      }
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      let mainImageUrl = mainImage?.isExisting ? mainImage.url : '';
      let additionalImageUrls: string[] = additionalImages
        .filter(img => img.isExisting)
        .map(img => img.url!);

      // Upload new main image if changed
      if (mainImage && !mainImage.isExisting) {
        mainImageUrl = await uploadProductImage(mainImage.file, user.id);
      }

      // Upload new additional images
      const newAdditionalImages = additionalImages.filter(img => !img.isExisting);
      if (newAdditionalImages.length > 0) {
        const newUrls = await uploadMultipleProductImages(
          newAdditionalImages.map(img => img.file),
          user.id
        );
        additionalImageUrls = [...additionalImageUrls, ...newUrls];
      }

      const { error: updateError } = await supabase
        .from('products')
        .update({
          sku: formData.sku,
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          stock_quantity: parseInt(formData.stock_quantity),
          metadata: {
            brand: formData.brand,
            category: formData.category,
            dimensions: {
              weight: parseFloat(formData.weight),
              length: parseFloat(formData.length),
              width: parseFloat(formData.width),
              height: parseFloat(formData.height)
            },
            images: {
              main: mainImageUrl,
              additional: additionalImageUrls
            },
            ean: formData.ean,
            warranty: parseInt(formData.warranty)
          }
        })
        .eq('id', id);

      if (updateError) throw updateError;
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating the product');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup URLs on unmount
  React.useEffect(() => {
    return () => {
      if (mainImage && !mainImage.isExisting) {
        URL.revokeObjectURL(mainImage.preview);
      }
      additionalImages.forEach(img => {
        if (!img.isExisting) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, []);

  if (loadingProduct) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Store className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">{t('nav.title')}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </button>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Product</h1>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">{t('product.form.sections.basic')}</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
                        {t('product.form.fields.sku')}
                      </label>
                      <input
                        type="text"
                        name="sku"
                        id="sku"
                        required
                        value={formData.sku}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        {t('product.form.fields.name')}
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      {t('product.form.fields.description')}
                    </label>
                    <textarea
                      name="description"
                      id="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                {/* Pricing and Inventory */}
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">{t('product.form.sections.pricing')}</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                        {t('product.form.fields.price')}
                      </label>
                      <input
                        type="number"
                        name="price"
                        id="price"
                        required
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700">
                        {t('product.form.fields.stock')}
                      </label>
                      <input
                        type="number"
                        name="stock_quantity"
                        id="stock_quantity"
                        required
                        min="0"
                        value={formData.stock_quantity}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Dimensions */}
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">{t('product.form.sections.dimensions')}</h2>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <label htmlFor="weight" className="block text-sm font-medium text-gray-700">
                        {t('product.form.fields.weight')}
                      </label>
                      <input
                        type="number"
                        name="weight"
                        id="weight"
                        min="0"
                        step="0.01"
                        value={formData.weight}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="length" className="block text-sm font-medium text-gray-700">
                        {t('product.form.fields.length')}
                      </label>
                      <input
                        type="number"
                        name="length"
                        id="length"
                        min="0"
                        step="0.1"
                        value={formData.length}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="width" className="block text-sm font-medium text-gray-700">
                        {t('product.form.fields.width')}
                      </label>
                      <input
                        type="number"
                        name="width"
                        id="width"
                        min="0"
                        step="0.1"
                        value={formData.width}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="height" className="block text-sm font-medium text-gray-700">
                        {t('product.form.fields.height')}
                      </label>
                      <input
                        type="number"
                        name="height"
                        id="height"
                        min="0"
                        step="0.1"
                        value={formData.height}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">{t('product.form.sections.additional')}</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
                        {t('product.form.fields.brand')}
                      </label>
                      <input
                        type="text"
                        name="brand"
                        id="brand"
                        value={formData.brand}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                        {t('product.form.fields.category')}
                      </label>
                      <input
                        type="text"
                        name="category"
                        id="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="ean" className="block text-sm font-medium text-gray-700">
                        {t('product.form.fields.ean')}
                      </label>
                      <input
                        type="text"
                        name="ean"
                        id="ean"
                        value={formData.ean}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="warranty" className="block text-sm font-medium text-gray-700">
                        {t('product.form.fields.warranty')}
                      </label>
                      <input
                        type="number"
                        name="warranty"
                        id="warranty"
                        min="0"
                        value={formData.warranty}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Images */}
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">{t('product.form.sections.images')}</h2>
                  
                  {/* Main Image */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Main Image
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        {mainImage ? (
                          <div className="relative rounded-lg border border-gray-300 p-2">
                            <img
                              src={mainImage.preview}
                              alt="Main product"
                              className="h-32 w-32 object-cover rounded"
                            />
                            <button
                              type="button"
                              onClick={removeMainImage}
                              className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 hover:bg-red-200"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => mainImageInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500"
                          >
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                            <span className="mt-2 text-sm text-gray-500">Click to upload main image</span>
                            <span className="mt-1 text-xs text-gray-400">Max size: 5MB</span>
                          </div>
                        )}
                        <input
                          type="file"
                          ref={mainImageInputRef}
                          onChange={handleMainImageSelect}
                          accept="image/*"
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Images */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Images
                    </label>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {additionalImages.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image.preview}
                            alt={`Product ${index + 1}`}
                            className="h-24 w-24 object-cover rounded"
                          />
                          <button
                            type="button"
                            onClick={() => removeAdditionalImage(index)}
                            className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 hover:bg-red-200"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      ))}
                      <div
                        onClick={() => additionalImagesInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500"
                      >
                        <Upload className="h-6 w-6 text-gray-400" />
                        <span className="mt-2 text-xs text-center text-gray-500">Add more images</span>
                      </div>
                    </div>
                    <input
                      type="file"
                      ref={additionalImagesInputRef}
                      onChange={handleAdditionalImagesSelect}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}