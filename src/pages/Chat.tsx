import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Profile } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import FriendsList from '@/components/chat/FriendsList';
import ChatWindow from '@/components/chat/ChatWindow';
import UserSearch from '@/components/chat/UserSearch';
import Notifications from '@/components/chat/Notifications';
import ProfileView from '@/components/chat/ProfileView';
import { LogOut, Settings, Sun, Moon, Search, MessageCircle, Menu } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerClose } from '@/components/ui/drawer';

const Chat: React.FC = () => {
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null);
  const [viewingProfile, setViewingProfile] = useState<Profile | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" className="md:hidden inline-flex items-center justify-center rounded-md p-1 mr-2" onClick={() => setMobileSidebarOpen(true)} aria-label="Open menu" aria-expanded={mobileSidebarOpen}>
            <Menu className="h-5 w-5 text-primary" />
          </button>
          <MessageCircle className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Syncora</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Search className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Search Users</DialogTitle>
              </DialogHeader>
              <UserSearch onClose={() => setSearchOpen(false)} />
            </DialogContent>
          </Dialog>

          <Notifications />

          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'light' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {profile?.username?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <Settings className="h-4 w-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (hidden on small screens) */}
        <aside className="hidden md:flex md:w-72 border-r flex-col">
          <div className="p-3 border-b">
            <h2 className="font-semibold text-sm text-muted-foreground">Friends</h2>
          </div>
          <FriendsList
            selectedFriend={selectedFriend}
            onSelectFriend={setSelectedFriend}
            onViewProfile={setViewingProfile}
          />
        </aside>

        {/* Mobile Drawer for Friends */}
        <Drawer open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <DrawerContent>
            <DrawerHeader>
              <div className="flex items-center justify-between">
                <DrawerTitle>Friends</DrawerTitle>
                <button type="button" className="inline-flex items-center justify-center rounded-md p-1" onClick={() => setMobileSidebarOpen(false)} aria-label="Close menu">
                  Close
                </button>
              </div>
            </DrawerHeader>
            <div className="px-4 pb-6 pt-2">
              <FriendsList
                selectedFriend={selectedFriend}
                onSelectFriend={(f) => {
                  setSelectedFriend(f);
                  setMobileSidebarOpen(false);
                }}
                onViewProfile={(f) => {
                  setViewingProfile(f);
                  setMobileSidebarOpen(false);
                }}
              />
            </div>
          </DrawerContent>
        </Drawer>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <ChatWindow 
            friend={selectedFriend} 
            onViewProfile={setViewingProfile}
          />
        </main>
      </div>

      {/* Profile View Modal */}
      <ProfileView
        profile={viewingProfile}
        open={!!viewingProfile}
        onOpenChange={(open) => !open && setViewingProfile(null)}
      />
    </div>
  );
};

export default Chat;
