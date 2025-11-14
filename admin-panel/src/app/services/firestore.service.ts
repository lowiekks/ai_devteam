import { Injectable, inject, signal } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  QueryConstraint,
  getDocs,
  getCountFromServer,
} from '@angular/fire/firestore';
import { Observable, firstValueFrom } from 'rxjs';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  role: string;
  shopifyUrl?: string;
  woocommerceUrl?: string;
  createdAt: Timestamp;
  lastLoginAt?: Timestamp;
  status: 'active' | 'inactive' | 'suspended';
}

export interface Product {
  id: string;
  userId: string;
  public_data: {
    title: string;
    short_description?: string;
    images?: string[];
  };
  monitored_supplier: {
    url: string;
    current_price: number;
    previous_price?: number;
    platform: string;
  };
  content_status: string;
  created_at: Timestamp;
  updated_at?: Timestamp;
}

export interface Analytics {
  totalUsers: number;
  activeUsers: number;
  totalProducts: number;
  totalRevenue: number;
  activeStores: number;
}

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  private firestore = inject(Firestore);

  // Loading states
  usersLoading = signal(false);
  productsLoading = signal(false);
  analyticsLoading = signal(false);

  // Error states
  usersError = signal<string | null>(null);
  productsError = signal<string | null>(null);
  analyticsError = signal<string | null>(null);

  // ==================== Users ====================

  getUsers(constraints: QueryConstraint[] = []): Observable<User[]> {
    this.usersLoading.set(true);
    this.usersError.set(null);

    try {
      const usersCollection = collection(this.firestore, 'users');
      const q = query(usersCollection, ...constraints);
      return collectionData(q, { idField: 'id' }) as Observable<User[]>;
    } catch (error: any) {
      this.usersError.set(error.message || 'Failed to fetch users');
      throw error;
    } finally {
      this.usersLoading.set(false);
    }
  }

  getUser(userId: string): Observable<User> {
    this.usersLoading.set(true);
    this.usersError.set(null);

    try {
      const userDoc = doc(this.firestore, `users/${userId}`);
      return docData(userDoc, { idField: 'id' }) as Observable<User>;
    } catch (error: any) {
      this.usersError.set(error.message || 'Failed to fetch user');
      throw error;
    } finally {
      this.usersLoading.set(false);
    }
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<string> {
    this.usersLoading.set(true);
    this.usersError.set(null);

    try {
      const usersCollection = collection(this.firestore, 'users');
      const newUser = {
        ...userData,
        createdAt: Timestamp.now(),
      };
      const docRef = await addDoc(usersCollection, newUser);
      return docRef.id;
    } catch (error: any) {
      this.usersError.set(error.message || 'Failed to create user');
      throw error;
    } finally {
      this.usersLoading.set(false);
    }
  }

  async updateUser(userId: string, data: Partial<User>): Promise<void> {
    this.usersLoading.set(true);
    this.usersError.set(null);

    try {
      const userDoc = doc(this.firestore, `users/${userId}`);
      await updateDoc(userDoc, data as any);
    } catch (error: any) {
      this.usersError.set(error.message || 'Failed to update user');
      throw error;
    } finally {
      this.usersLoading.set(false);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    this.usersLoading.set(true);
    this.usersError.set(null);

    try {
      const userDoc = doc(this.firestore, `users/${userId}`);
      await deleteDoc(userDoc);
    } catch (error: any) {
      this.usersError.set(error.message || 'Failed to delete user');
      throw error;
    } finally {
      this.usersLoading.set(false);
    }
  }

  // ==================== Products ====================

  getProducts(constraints: QueryConstraint[] = []): Observable<Product[]> {
    this.productsLoading.set(true);
    this.productsError.set(null);

    try {
      const productsCollection = collection(this.firestore, 'monitored_products');
      const q = query(productsCollection, ...constraints);
      return collectionData(q, { idField: 'id' }) as Observable<Product[]>;
    } catch (error: any) {
      this.productsError.set(error.message || 'Failed to fetch products');
      throw error;
    } finally {
      this.productsLoading.set(false);
    }
  }

  getProduct(productId: string): Observable<Product> {
    this.productsLoading.set(true);
    this.productsError.set(null);

    try {
      const productDoc = doc(this.firestore, `monitored_products/${productId}`);
      return docData(productDoc, { idField: 'id' }) as Observable<Product>;
    } catch (error: any) {
      this.productsError.set(error.message || 'Failed to fetch product');
      throw error;
    } finally {
      this.productsLoading.set(false);
    }
  }

  async updateProduct(productId: string, data: Partial<Product>): Promise<void> {
    this.productsLoading.set(true);
    this.productsError.set(null);

    try {
      const productDoc = doc(this.firestore, `monitored_products/${productId}`);
      await updateDoc(productDoc, {
        ...data,
        updated_at: Timestamp.now(),
      } as any);
    } catch (error: any) {
      this.productsError.set(error.message || 'Failed to update product');
      throw error;
    } finally {
      this.productsLoading.set(false);
    }
  }

  async deleteProduct(productId: string): Promise<void> {
    this.productsLoading.set(true);
    this.productsError.set(null);

    try {
      const productDoc = doc(this.firestore, `monitored_products/${productId}`);
      await deleteDoc(productDoc);
    } catch (error: any) {
      this.productsError.set(error.message || 'Failed to delete product');
      throw error;
    } finally {
      this.productsLoading.set(false);
    }
  }

  // ==================== Analytics ====================

  async getAnalytics(): Promise<Analytics> {
    this.analyticsLoading.set(true);
    this.analyticsError.set(null);

    try {
      // Fetch all data concurrently for better performance
      const [usersSnapshot, activeUsersSnapshot, productsSnapshot] = await Promise.all([
        // Total users count
        getCountFromServer(query(collection(this.firestore, 'users'))),
        // Active users count
        getCountFromServer(
          query(collection(this.firestore, 'users'), where('status', '==', 'active'))
        ),
        // Total products count
        getCountFromServer(query(collection(this.firestore, 'monitored_products'))),
      ]);

      const totalUsers = usersSnapshot.data().count;
      const activeUsers = activeUsersSnapshot.data().count;
      const totalProducts = productsSnapshot.data().count;

      // Fetch users with stores to count active stores
      const usersQuery = query(collection(this.firestore, 'users'));
      const usersData = await getDocs(usersQuery);

      let activeStores = 0;
      let totalRevenue = 0;

      usersData.forEach((doc) => {
        const user = doc.data() as User;
        if (user.shopifyUrl || user.woocommerceUrl) {
          activeStores++;
        }
      });

      // Estimate revenue based on products (in real app, this would come from orders/transactions)
      // Assuming average product generates $50 revenue
      totalRevenue = totalProducts * 50;

      return {
        totalUsers,
        activeUsers,
        totalProducts,
        totalRevenue,
        activeStores,
      };
    } catch (error: any) {
      this.analyticsError.set(error.message || 'Failed to fetch analytics');
      // Return fallback data on error
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalProducts: 0,
        totalRevenue: 0,
        activeStores: 0,
      };
    } finally {
      this.analyticsLoading.set(false);
    }
  }
}
