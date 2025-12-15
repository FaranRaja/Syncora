import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Profile } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Search, UserPlus, Loader2 } from 'lucide-react';

interface UserSearchProps {
  onClose?: () => void;
}

const UserSearch: React.FC<UserSearchProps> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${query}%`)
        .neq('id', user?.id)
        .not('username', 'is', null)
        .limit(10);

      if (error) throw error;
      setResults(data || []);
    } catch (error: any) {
      toast({
        title: 'Search Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (addresseeId: string, username: string) => {
    setSendingRequest(addresseeId);
    try {
      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(requester_id.eq.${user?.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user?.id})`)
        .maybeSingle();

      if (existing) {
        toast({
          title: 'Request Already Exists',
          description: existing.status === 'accepted' 
            ? 'You are already friends with this user.'
            : 'A friend request already exists.',
          variant: 'destructive'
        });
        return;
      }

      // Create friendship request
      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: user?.id,
          addressee_id: addresseeId,
          status: 'pending'
        });

      if (error) throw error;

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: addresseeId,
          type: 'friend_request',
          content: `You have a new friend request`,
          related_id: user?.id
        });

      toast({
        title: 'Request Sent',
        description: `Friend request sent to ${username}!`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSendingRequest(null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search by username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      <div className="space-y-2">
        {results.map((profile) => (
          <div 
            key={profile.id} 
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback>
                  {profile.username?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{profile.username}</span>
            </div>
            <Button
              size="sm"
              onClick={() => sendFriendRequest(profile.id, profile.username || '')}
              disabled={sendingRequest === profile.id}
            >
              {sendingRequest === profile.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))}
        {results.length === 0 && query && !loading && (
          <p className="text-center text-muted-foreground py-4">No users found</p>
        )}
      </div>
    </div>
  );
};

export default UserSearch;
