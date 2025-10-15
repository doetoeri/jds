
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash2, Loader2, Edit, Image as ImageIcon, ShoppingCart } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string;
  imagePath: string;
}

export default function CouncilShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('');
  const [productImage, setProductImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'products'), orderBy('name'));
      const productSnapshot = await getDocs(q);
      const productList = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productList);
    } catch (error) {
      toast({ title: "오류", description: "상품 목록을 불러오는 데 실패했습니다.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const resetForm = () => {
    setCurrentProduct(null);
    setProductName('');
    setProductPrice('');
    setProductStock('');
    setProductImage(null);
    setImagePreview(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenDialog = (product: Partial<Product> | null = null) => {
    resetForm();
    if (product) {
      setCurrentProduct(product);
      setProductName(product.name || '');
      setProductPrice(String(product.price || ''));
      setProductStock(String(product.stock || ''));
      setImagePreview(product.imageUrl || null);
    }
    setIsDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProductImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!productName || !productPrice || !productStock) {
      toast({ title: "입력 오류", description: "상품명, 가격, 재고는 필수입니다.", variant: "destructive" });
      return;
    }
    
    setIsProcessing(true);
    try {
      let imageUrl = currentProduct?.imageUrl || '';
      let imagePath = currentProduct?.imagePath || '';

      if (productImage) {
        // Delete old image if updating
        if (currentProduct?.id && currentProduct.imagePath) {
            const oldImageRef = ref(storage, currentProduct.imagePath);
            await deleteObject(oldImageRef).catch(err => console.warn("Old image deletion failed, maybe it didn't exist.", err));
        }

        const newImagePath = `products/${Date.now()}_${productImage.name}`;
        const imageRef = ref(storage, newImagePath);
        const snapshot = await uploadBytes(imageRef, productImage);
        imageUrl = await getDownloadURL(snapshot.ref);
        imagePath = newImagePath;
      }

      const productData = {
        name: productName,
        price: Number(productPrice),
        stock: Number(productStock),
        imageUrl,
        imagePath
      };

      if (currentProduct?.id) {
        // Update existing product
        const productRef = doc(db, 'products', currentProduct.id);
        await updateDoc(productRef, productData);
        toast({ title: "성공", description: "상품 정보가 수정되었습니다." });
      } else {
        // Create new product
        await addDoc(collection(db, 'products'), productData);
        toast({ title: "성공", description: "새 상품이 추가되었습니다." });
      }

      setIsDialogOpen(false);
      fetchProducts();

    } catch (error) {
      toast({ title: "오류", description: "상품 처리 중 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`'${product.name}' 상품을 정말 삭제하시겠습니까?`)) return;

    setIsDeleting(product.id);
    try {
      // Delete image from storage
      if (product.imagePath) {
        const imageRef = ref(storage, product.imagePath);
        await deleteObject(imageRef).catch(err => console.warn("Image deletion failed, maybe it didn't exist.", err));
      }
      // Delete doc from firestore
      await deleteDoc(doc(db, 'products', product.id));
      
      toast({ title: "삭제 완료", description: "상품이 삭제되었습니다." });
      fetchProducts();

    } catch (error) {
       toast({ title: "오류", description: "상품 삭제 중 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsDeleting(null);
    }
  }


  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center gap-2"><ShoppingCart />상점 관리</h1>
            <p className="text-muted-foreground">상품을 추가, 수정, 삭제하고 재고를 관리합니다.</p>
        </div>
        <Button size="sm" className="gap-1" onClick={() => handleOpenDialog()}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                상품 추가
            </span>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">이미지</TableHead>
                <TableHead>상품명</TableHead>
                <TableHead>가격</TableHead>
                <TableHead>재고</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
               {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={5}><Skeleton className="h-12 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">등록된 상품이 없습니다.</TableCell>
                </TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="hidden sm:table-cell">
                      {p.imageUrl ? (
                        <Image
                          alt={p.name}
                          className="aspect-square rounded-md object-cover"
                          height="64"
                          src={p.imageUrl}
                          width="64"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground"/>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.price} 포인트</TableCell>
                    <TableCell>
                        <Badge variant={p.stock > 10 ? 'default' : p.stock > 0 ? 'secondary' : 'destructive'}>
                            {p.stock}개
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                        <Button size="icon" variant="outline" onClick={() => handleOpenDialog(p)}>
                            <Edit className="h-4 w-4"/>
                            <span className="sr-only">수정</span>
                        </Button>
                        <Button size="icon" variant="destructive" onClick={() => handleDeleteProduct(p)} disabled={isDeleting === p.id}>
                            {isDeleting === p.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
                             <span className="sr-only">삭제</span>
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if(!isOpen) resetForm(); setIsDialogOpen(isOpen);}}>
          <DialogContent>
            <DialogHeader>
                <DialogTitle>{currentProduct?.id ? '상품 수정' : '새 상품 추가'}</DialogTitle>
                <DialogDescription>상품의 세부 정보를 입력해주세요.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="product-name">상품명</Label>
                    <Input id="product-name" value={productName} onChange={e => setProductName(e.target.value)} disabled={isProcessing} />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="product-price">가격 (포인트)</Label>
                        <Input id="product-price" type="number" value={productPrice} onChange={e => setProductPrice(e.target.value)} disabled={isProcessing} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="product-stock">재고</Label>
                        <Input id="product-stock" type="number" value={productStock} onChange={e => setProductStock(e.target.value)} disabled={isProcessing} />
                    </div>
                 </div>
                 <div className="space-y-2">
                     <Label>상품 이미지 (선택)</Label>
                     <div className="flex items-center gap-4">
                        {imagePreview ? (
                            <Image src={imagePreview} alt="preview" width={80} height={80} className="rounded-md object-cover"/>
                        ) : (
                            <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-muted-foreground"/>
                            </div>
                        )}
                        <Input id="picture" type="file" accept="image/*" onChange={handleImageChange} ref={fileInputRef} disabled={isProcessing} className="flex-1"/>
                     </div>
                 </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isProcessing}>취소</Button>
                <Button onClick={handleSubmit} disabled={isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {currentProduct?.id ? '수정하기' : '추가하기'}
                </Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
