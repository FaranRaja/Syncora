import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Profile, Friendship } from '@/types/database';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface FriendsListProps {
  selectedFriend: Profile | null;
  onSelectFriend: (friend: Profile) => void;
  onViewProfile: (friend: Profile) => void;
}

const FriendsList: React.FC<FriendsListProps> = ({ 
  selectedFriend, 
  onSelectFriend,
  onViewProfile 
}) => {
  const [friends, setFriends] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchFriends = async () => {
    if (!user) return;

    try {
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:profiles!friendships_requester_id_fkey(*),
          addressee:profiles!friendships_addressee_id_fkey(*)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (error) throw error;

      const friendProfiles = friendships?.map((f: any) => {
        return f.requester_id === user.id ? f.addressee : f.requester;
      }).filter(Boolean) || [];

      setFriends(friendProfiles);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();

    const channel = supabase
      .channel('friendships-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships'
        },
        () => {
          fetchFriends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Loading friends...
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>No friends yet</p>
        <p className="text-sm">Search for users to add friends!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {friends.map((friend) => (
          <div
            key={friend.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
              selectedFriend?.id === friend.id 
                ? "bg-primary/10" 
                : "hover:bg-muted"
            )}
            onClick={() => onSelectFriend(friend)}
          >
            <Avatar 
              className="cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              onClick={(e) => {
                e.stopPropagation();
                onViewProfile(friend);
              }}
            >
              <AvatarImage src={friend.avatar_url || undefined} />
              <AvatarFallback>
                {friend.username?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{friend.username}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default FriendsList;
