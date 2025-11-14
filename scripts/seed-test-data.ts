/**
 * Seed Test Data Script
 * Populates Firebase Emulators with test data for local development
 *
 * Usage: npm run seed-data
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin with emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

const app = initializeApp({
  projectId: 'demo-project',
});

const db = getFirestore(app);
const auth = getAuth(app);

async function seedTestData() {
  console.log('🌱 Seeding test data...\n');

  try {
    // 1. Create test users
    console.log('👤 Creating test users...');
    const testUser = await auth.createUser({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
      emailVerified: true,
    });
    console.log(`✅ Created user: ${testUser.email}`);

    const adminUser = await auth.createUser({
      email: 'admin@example.com',
      password: 'admin123',
      displayName: 'Admin User',
      emailVerified: true,
    });
    console.log(`✅ Created admin: ${adminUser.email}\n`);

    // 2. Create test products
    console.log('📦 Creating test products...');
    const products = [
      {
        user_id: testUser.uid,
        content_status: 'LIVE',
        public_data: {
          title: 'Premium Wireless Earbuds Pro',
          short_description: 'High-quality wireless earbuds with active noise cancellation',
          long_description: 'Experience crystal-clear audio with our Premium Wireless Earbuds. Features include active noise cancellation, 30-hour battery life, and IPX7 water resistance.',
          features: [
            'Active Noise Cancellation',
            '30-hour battery life',
            'IPX7 Water Resistant',
            'Bluetooth 5.2',
            'Touch controls',
          ],
          images: [
            'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800',
            'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800',
          ],
        },
        monitored_supplier: {
          platform: 'aliexpress',
          url: 'https://aliexpress.com/item/example1',
          current_price: 49.99,
          previous_price: 59.99,
          in_stock: true,
        },
        created_at: new Date('2024-01-15'),
        updated_at: new Date(),
      },
      {
        user_id: testUser.uid,
        content_status: 'REVIEW',
        public_data: {
          title: 'Smart Fitness Watch Ultra',
          short_description: 'Track your fitness goals with precision',
          features: [
            'Heart rate monitoring',
            'GPS tracking',
            '7-day battery life',
            'Water resistant',
          ],
          images: [
            'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800',
          ],
        },
        monitored_supplier: {
          platform: 'amazon',
          url: 'https://amazon.com/example2',
          current_price: 129.99,
          in_stock: true,
        },
        created_at: new Date('2024-01-20'),
        updated_at: new Date(),
      },
      {
        user_id: testUser.uid,
        content_status: 'PROCESSING',
        public_data: {
          title: 'Portable Blender for Smoothies',
          short_description: 'Make smoothies anywhere',
          images: [
            'https://images.unsplash.com/photo-1585515320310-259814833857?w=800',
          ],
        },
        monitored_supplier: {
          platform: 'aliexpress',
          url: 'https://aliexpress.com/item/example3',
          current_price: 24.99,
          in_stock: false,
        },
        created_at: new Date('2024-02-01'),
        updated_at: new Date(),
      },
    ];

    for (const product of products) {
      const docRef = await db.collection('products').add(product);
      console.log(`✅ Created product: ${product.public_data.title} (${docRef.id})`);
    }
    console.log();

    // 3. Create test plugins
    console.log('🔌 Creating test plugins...');
    const plugins = [
      {
        plugin_id: 'ai-auto-healer',
        name: 'AI Auto-Healer',
        description: 'Automatically replace out-of-stock products with AI-powered alternatives',
        category: 'automation',
        monthly_cost: 10,
        features: [
          'Automatic product replacement',
          'AI-powered similar product matching',
          'Stock monitoring',
          'Email notifications',
        ],
        rating: 4.8,
        installs: 1542,
        is_active: true,
      },
      {
        plugin_id: 'seo-blog-writer',
        name: 'SEO Blog Writer',
        description: 'Generate SEO-optimized blog posts for your products automatically',
        category: 'content',
        monthly_cost: 15,
        features: [
          '1000-word blog posts',
          'SEO optimization',
          'Internal linking',
          'Schema markup',
        ],
        rating: 4.6,
        installs: 892,
        is_active: true,
      },
      {
        plugin_id: 'review-importer',
        name: 'Review Importer',
        description: 'Import and manage customer reviews from multiple sources',
        category: 'marketing',
        monthly_cost: 5,
        features: [
          'AliExpress review import',
          'Amazon review sync',
          'Review moderation',
          'Star ratings',
        ],
        rating: 4.5,
        installs: 2341,
        is_active: true,
      },
    ];

    for (const plugin of plugins) {
      await db.collection('plugins').doc(plugin.plugin_id).set(plugin);
      console.log(`✅ Created plugin: ${plugin.name}`);
    }
    console.log();

    // 4. Create user settings
    console.log('⚙️ Creating user settings...');
    await db.collection('users').doc(testUser.uid).set({
      email: testUser.email,
      displayName: testUser.displayName,
      subscription_plan: 'free',
      settings: {
        notifications: {
          email: true,
          price_alerts: true,
          stock_alerts: true,
        },
      },
      created_at: new Date(),
    });
    console.log(`✅ Created settings for ${testUser.email}\n`);

    console.log('✨ Test data seeded successfully!\n');
    console.log('🔑 Test Credentials:');
    console.log('   Email: test@example.com');
    console.log('   Password: password123\n');
    console.log('🔑 Admin Credentials:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123\n');
    console.log('🌐 Firebase Emulator UI: http://localhost:4000');
    console.log('🚀 Next.js Dev Server: http://localhost:3000\n');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedTestData();
