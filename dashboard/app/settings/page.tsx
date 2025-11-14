'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { updateProfile, updateEmail, updatePassword } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Mail,
  Lock,
  Bell,
  Zap,
  CreditCard,
  Link as LinkIcon,
  Save,
  AlertCircle,
} from 'lucide-react';

export default function SettingsPage() {
  const { showToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Profile settings
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [stockAlerts, setStockAlerts] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setDisplayName(currentUser.displayName || '');
        setEmail(currentUser.email || '');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setLoading(true);

    try {
      await updateProfile(user, { displayName });
      showToast({
        type: 'success',
        title: 'Profile updated',
        message: 'Your profile has been successfully updated.',
      });
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Update failed',
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      showToast({
        type: 'error',
        title: 'Password mismatch',
        message: 'New passwords do not match.',
      });
      return;
    }

    if (newPassword.length < 6) {
      showToast({
        type: 'error',
        title: 'Weak password',
        message: 'Password must be at least 6 characters.',
      });
      return;
    }

    if (!user) return;
    setLoading(true);

    try {
      await updatePassword(user, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast({
        type: 'success',
        title: 'Password updated',
        message: 'Your password has been successfully changed.',
      });
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Update failed',
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = () => {
    // Save to database/localStorage
    showToast({
      type: 'success',
      title: 'Preferences saved',
      message: 'Your notification preferences have been updated.',
    });
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage your account and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-900/30 border border-blue-700 rounded-lg">
                <User className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your account details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
            <Input
              label="Email"
              type="email"
              value={email}
              disabled
              placeholder="your@email.com"
            />
            <div className="flex justify-end">
              <Button onClick={handleUpdateProfile} isLoading={loading}>
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-900/30 border border-purple-700 rounded-lg">
                <Lock className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your password</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
            <div className="flex justify-end">
              <Button onClick={handleUpdatePassword} isLoading={loading}>
                <Save className="w-4 h-4" />
                Update Password
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-900/30 border border-green-700 rounded-lg">
                <Bell className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Choose what updates you receive</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-700">
              <div>
                <p className="font-medium text-white">Email Notifications</p>
                <p className="text-sm text-gray-400">
                  Receive email updates about your account
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-700">
              <div>
                <p className="font-medium text-white">Price Change Alerts</p>
                <p className="text-sm text-gray-400">
                  Get notified when product prices change
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={priceAlerts}
                  onChange={(e) => setPriceAlerts(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-700">
              <div>
                <p className="font-medium text-white">Stock Alerts</p>
                <p className="text-sm text-gray-400">
                  Alerts when products go out of stock
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={stockAlerts}
                  onChange={(e) => setStockAlerts(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-white">Weekly Reports</p>
                <p className="text-sm text-gray-400">
                  Receive weekly performance summaries
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={weeklyReports}
                  onChange={(e) => setWeeklyReports(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveNotifications}>
                <Save className="w-4 h-4" />
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                  <CreditCard className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <CardTitle>Subscription</CardTitle>
                  <CardDescription>Manage your subscription plan</CardDescription>
                </div>
              </div>
              <Badge variant="secondary">Free Plan</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-700/30 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-2">Upgrade to Pro</h3>
              <p className="text-gray-300 mb-4">
                Unlock advanced features, unlimited products, and priority support
              </p>
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-3xl font-bold text-white">$29</div>
                  <div className="text-sm text-gray-400">per month</div>
                </div>
                <Button className="ml-auto">
                  <Zap className="w-4 h-4" />
                  Upgrade Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-900/30 border border-pink-700 rounded-lg">
                <LinkIcon className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <CardTitle>Integrations</CardTitle>
                <CardDescription>Connect your e-commerce platforms</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-900/30 border border-green-700 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🛍️</span>
                </div>
                <div>
                  <p className="font-medium text-white">Shopify</p>
                  <p className="text-sm text-gray-400">Not connected</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Connect
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-900/30 border border-purple-700 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🔌</span>
                </div>
                <div>
                  <p className="font-medium text-white">WooCommerce</p>
                  <p className="text-sm text-gray-400">Not connected</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Connect
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-700/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-900/30 border border-red-700 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <CardTitle className="text-red-400">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Delete Account</p>
                  <p className="text-sm text-gray-400">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Delete Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
