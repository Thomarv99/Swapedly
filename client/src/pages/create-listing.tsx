import { AuthenticatedLayout } from "@/components/layouts";
import { SwapBucksAmount, StatusBadge, ListingCard } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Coins, Upload, Video, X, Save, Send, ImagePlus, Loader2, Link as LinkIcon, Star, StarOff, Sparkles } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn, API_BASE, getAuthToken, resolveImageUrl } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useOnboarding } from "@/components/onboarding-guard";
import { useParams, useLocation } from "wouter";
import { useState, useEffect, useRef, useCallback } from "react";
import type { Listing } from "@shared/schema";

const CATEGORIES = [
  "Electronics", "Gaming", "Fashion", "Home & Garden", "Sports & Outdoors",
  "Books & Media", "Toys & Hobbies", "Auto & Parts", "Musical Instruments",
  "Art & Collectibles", "Services", "Other",
];

const CONDITIONS = [
  { value: "new", label: "New", desc: "Brand new, unused" },
  { value: "like_new", label: "Like New", desc: "Barely used, excellent condition" },
  { value: "good", label: "Good", desc: "Used but well-maintained" },
  { value: "fair", label: "Fair", desc: "Shows wear, fully functional" },
  { value: "poor", label: "Poor", desc: "Significant wear, still works" },
];

type FormValues = {
  title: string;
  description: string;
  price: number;
  category: string;
  subcategory?: string;
  condition: string;
  tags: string;
  videoUrl?: string;
  localPickup: boolean;
  shipping: boolean;
  shippingCost?: number;
};

export default function CreateEditListingPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: onboardingData } = useOnboarding();

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (fileArray.length === 0) {
      toast({ title: "Invalid files", description: "Please select image files (JPEG, PNG, GIF, WebP)", variant: "destructive" });
      return;
    }
    if (imageUrls.length + fileArray.length > 10) {
      toast({ title: "Too many images", description: "Maximum 10 images per listing", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      fileArray.slice(0, 5).forEach(file => formData.append("images", file));

      const headers: Record<string, string> = {};
      const token = getAuthToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: formData,
        headers,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Upload failed");
      }

      const { urls } = await response.json();
      setImageUrls(prev => [...prev, ...urls]);
      toast({ title: `${urls.length} image${urls.length > 1 ? "s" : ""} uploaded` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [imageUrls.length, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const { data: existingListing } = useQuery<Listing>({
    queryKey: [`/api/listings/${id}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isEdit,
  });

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      condition: "good",
      localPickup: true,
      shipping: false,
    },
  });

  useEffect(() => {
    if (existingListing && isEdit) {
      const deliveryOpts = existingListing.deliveryOptions ? JSON.parse(existingListing.deliveryOptions) : {};
      const tags = existingListing.tags ? JSON.parse(existingListing.tags) : [];
      const images = existingListing.images ? JSON.parse(existingListing.images) : [];
      setImageUrls(images);
      reset({
        title: existingListing.title,
        description: existingListing.description,
        price: existingListing.price,
        category: existingListing.category,
        subcategory: existingListing.subcategory || "",
        condition: existingListing.condition,
        tags: tags.join(", "),
        videoUrl: existingListing.videoUrl || "",
        localPickup: deliveryOpts.localPickup ?? false,
        shipping: deliveryOpts.shipping ?? false,
        shippingCost: deliveryOpts.shippingCost || undefined,
      });
    }
  }, [existingListing, isEdit, reset]);

  const watchAll = watch();

  const mutation = useMutation({
    mutationFn: async (data: FormValues & { status: string }) => {
      const body = {
        sellerId: user?.id,
        title: data.title,
        description: data.description,
        price: Number(data.price),
        category: data.category,
        subcategory: data.subcategory || null,
        condition: data.condition,
        tags: JSON.stringify(data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : []),
        images: JSON.stringify(imageUrls),
        videoUrl: data.videoUrl || null,
        deliveryOptions: JSON.stringify({
          localPickup: data.localPickup,
          shipping: data.shipping,
          shippingCost: data.shipping ? Number(data.shippingCost) || 0 : undefined,
        }),
        status: data.status,
      };
      if (isEdit) {
        await apiRequest("PUT", `/api/listings/${id}`, body);
      } else {
        await apiRequest("POST", "/api/listings", body);
      }
    },
    onSuccess: () => {
      toast({ title: isEdit ? "Listing updated!" : "Listing created!" });
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/listings/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
      // Check if user is in onboarding — redirect to appropriate step
      if (onboardingData && !onboardingData.onboardingComplete) {
        const newCount = (onboardingData.listingsCreated || 0) + 1;
        if (newCount >= 3) {
          navigate("/membership");
        } else {
          // Stay on create-listing for more listings — reset form
          toast({ title: `Listing ${newCount} of 3 created!`, description: `Create ${3 - newCount} more to continue` });
          reset({ condition: "good", localPickup: true, shipping: false });
          setImageUrls([]);
        }
        return;
      }
      navigate("/my-listings");
    },
    onError: (e: Error) => {
      if (e.message.includes("Listing credit required") || e.message.includes("402")) {
        toast({
          title: "Listing Credit Required",
          description: "Free accounts need listing credits to publish. Buy credits or upgrade to Swapedly Plus for unlimited listings.",
          variant: "destructive",
        });
        navigate("/membership");
        return;
      }
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const addImageUrl = () => {
    if (newImageUrl.trim()) {
      setImageUrls((prev) => [...prev, newImageUrl.trim()]);
      setNewImageUrl("");
    }
  };

  const removeImage = (idx: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const onPublish = handleSubmit((data) => mutation.mutate({ ...data, status: "active" }));
  const onSaveDraft = handleSubmit((data) => mutation.mutate({ ...data, status: "draft" }));

  const inOnboarding = onboardingData && !onboardingData.onboardingComplete && onboardingData.step === "listings";

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Onboarding progress banner */}
        {inOnboarding && (
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4" data-testid="onboarding-banner">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Welcome to Swapedly! Create your first listings</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add {3 - (onboardingData?.listingsCreated || 0)} more listing{(3 - (onboardingData?.listingsCreated || 0)) !== 1 ? "s" : ""} to continue
                </p>
              </div>
              <div className="flex items-center gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`h-3 w-3 rounded-full ${i < (onboardingData?.listingsCreated || 0) ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <h1 className="text-2xl font-bold">{isEdit ? "Edit Listing" : (inOnboarding ? `Create Listing ${(onboardingData?.listingsCreated || 0) + 1} of 3` : "Create New Listing")}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card className="rounded-xl">
              <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="What are you listing?"
                    className="rounded-xl"
                    data-testid="listing-title"
                    {...register("title", { required: "Title is required" })}
                  />
                  {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your item in detail..."
                    rows={5}
                    className="rounded-xl"
                    data-testid="listing-description"
                    {...register("description", { required: "Description is required" })}
                  />
                  {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card className="rounded-xl">
              <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Price in Swap Bucks</Label>
                  <div className="relative max-w-xs">
                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" />
                    <Input
                      type="number"
                      min={1}
                      placeholder="0"
                      className="pl-10 rounded-xl"
                      data-testid="listing-price"
                      {...register("price", { required: "Price is required", min: 1 })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">SB</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Categorization */}
            <Card className="rounded-xl">
              <CardHeader><CardTitle>Categorization</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Controller
                    name="category"
                    control={control}
                    rules={{ required: "Category is required" }}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="rounded-xl" data-testid="listing-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategory (optional)</Label>
                  <Input id="subcategory" placeholder="e.g., Smartphones" className="rounded-xl" data-testid="listing-subcategory" {...register("subcategory")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input id="tags" placeholder="e.g., vintage, rare, collectible" className="rounded-xl" data-testid="listing-tags" {...register("tags")} />
                </div>
              </CardContent>
            </Card>

            {/* Condition */}
            <Card className="rounded-xl">
              <CardHeader><CardTitle>Condition</CardTitle></CardHeader>
              <CardContent>
                <Controller
                  name="condition"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {CONDITIONS.map((c) => (
                        <label
                          key={c.value}
                          className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                            field.value === c.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                          }`}
                          data-testid={`condition-${c.value}`}
                        >
                          <RadioGroupItem value={c.value} className="sr-only" />
                          <span className="font-medium text-sm">{c.label}</span>
                          <span className="text-xs text-muted-foreground">{c.desc}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  )}
                />
              </CardContent>
            </Card>

            {/* Media */}
            <Card className="rounded-xl">
              <CardHeader><CardTitle>Media</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Images</Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">Upload up to 10 images. First image will be the cover photo.</p>

                  {/* Upload from computer - drag & drop zone */}
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                      dragActive
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                    } ${uploading ? "pointer-events-none opacity-60" : ""}`}
                    data-testid="image-dropzone"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                      data-testid="image-file-input"
                    />
                    {uploading ? (
                      <>
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <span className="text-sm text-muted-foreground">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <ImagePlus className="h-8 w-8 text-muted-foreground" />
                        <div className="text-center">
                          <span className="text-sm font-medium text-primary">Click to upload</span>
                          <span className="text-sm text-muted-foreground"> or drag and drop</span>
                        </div>
                        <span className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP (max 10 MB each)</span>
                      </>
                    )}
                  </div>

                  {/* OR add by URL */}
                  <div className="flex items-center gap-3 mt-4 mb-2">
                    <Separator className="flex-1" />
                    <span className="text-xs text-muted-foreground">or add by URL</span>
                    <Separator className="flex-1" />
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Paste image URL..."
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addImageUrl())}
                        className="pl-10 rounded-xl"
                        data-testid="image-url-input"
                      />
                    </div>
                    <Button type="button" onClick={addImageUrl} variant="outline" className="rounded-xl" data-testid="add-image-btn">
                      Add
                    </Button>
                  </div>

                  {/* Image thumbnails */}
                  {imageUrls.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 mt-4">
                      {imageUrls.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden border group">
                          <img src={resolveImageUrl(url)} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
                          {i === 0 && (
                            <span className="absolute bottom-1 left-1 text-[10px] font-medium bg-primary text-white px-1.5 py-0.5 rounded">Cover</span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`remove-image-${i}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="videoUrl">Video URL (optional)</Label>
                  <div className="relative">
                    <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="videoUrl" placeholder="YouTube or video URL" className="pl-10 rounded-xl" data-testid="listing-video" {...register("videoUrl")} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery */}
            <Card className="rounded-xl">
              <CardHeader><CardTitle>Delivery Options</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox id="localPickup" data-testid="delivery-pickup" {...register("localPickup")} defaultChecked />
                  <div>
                    <Label htmlFor="localPickup" className="font-medium">Local Pickup</Label>
                    <p className="text-xs text-muted-foreground">Buyer picks up the item in person</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox id="shipping" data-testid="delivery-shipping" {...register("shipping")} />
                  <div className="flex-1">
                    <Label htmlFor="shipping" className="font-medium">Shipping</Label>
                    <p className="text-xs text-muted-foreground">Ship the item to the buyer</p>
                    {watchAll.shipping && (
                      <div className="mt-2 max-w-xs">
                        <Label className="text-xs">Shipping Cost (SB)</Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          className="rounded-xl mt-1"
                          data-testid="shipping-cost"
                          {...register("shippingCost")}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Highlight toggle (edit mode, active listing, Plus user) */}
            {isEdit && existingListing?.status === "active" && (user as any)?.membershipTier === "plus" && (
              <Card className={`rounded-xl ${existingListing?.isHighlighted ? "border-yellow-300 bg-gradient-to-r from-yellow-50 to-amber-50" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${existingListing?.isHighlighted ? "bg-gradient-to-br from-yellow-400 to-amber-500" : "bg-muted"}`}>
                        <Sparkles className={`h-4 w-4 ${existingListing?.isHighlighted ? "text-white" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Product Highlight</p>
                        <p className="text-xs text-muted-foreground">
                          {existingListing?.isHighlighted ? "This listing is featured in the marketplace" : "Feature this listing to stand out"}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant={existingListing?.isHighlighted ? "default" : "outline"}
                      size="sm"
                      className={`rounded-lg gap-1.5 ${existingListing?.isHighlighted ? "bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 border-0" : ""}`}
                      onClick={async () => {
                        try {
                          if (existingListing?.isHighlighted) {
                            await apiRequest("DELETE", `/api/listings/${id}/highlight`);
                            toast({ title: "Highlight removed" });
                          } else {
                            await apiRequest("POST", `/api/listings/${id}/highlight`);
                            toast({ title: "Listing featured!", description: "Your listing is now highlighted in the marketplace" });
                          }
                          queryClient.invalidateQueries({ queryKey: [`/api/listings/${id}`] });
                          queryClient.invalidateQueries({ queryKey: ["/api/membership"] });
                        } catch (err: any) {
                          toast({ title: "Error", description: err.message, variant: "destructive" });
                        }
                      }}
                      data-testid="toggle-highlight-btn"
                    >
                      {existingListing?.isHighlighted ? <><StarOff className="h-3.5 w-3.5" /> Remove</> : <><Star className="h-3.5 w-3.5" /> Feature</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="rounded-xl gap-2" onClick={onSaveDraft} disabled={mutation.isPending} data-testid="save-draft-btn">
                <Save className="h-4 w-4" />
                Save Draft
              </Button>
              <Button type="button" className="rounded-xl gap-2" onClick={onPublish} disabled={mutation.isPending} data-testid="publish-btn">
                <Send className="h-4 w-4" />
                {isEdit ? "Update Listing" : "Publish Listing"}
              </Button>
            </div>
          </div>

          {/* Mini Preview */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground">Preview</h3>
              <ListingCard
                listing={{
                  id: 0,
                  title: watchAll.title || "Listing Title",
                  price: Number(watchAll.price) || 0,
                  condition: watchAll.condition || "good",
                  images: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
