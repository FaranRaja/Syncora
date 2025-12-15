import React from 'react';
import { Profile } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProfileViewProps {
  profile: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ profile, open, onOpenChange }) => {
  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-2xl">
              {profile.username?.charAt(0).toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h3 className="text-xl font-semibold">{profile.username}</h3>
            {profile.bio && (
              <p className="text-muted-foreground mt-2 max-w-sm">{profile.bio}</p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Joined {new Date(profile.created_at).toLocaleDateString()}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileView;
