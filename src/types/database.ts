export interface Profile {
  id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  requester?: Profile;
  addressee?: Profile;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  media_url: string | null;
  media_type: 'image' | 'video' | 'file' | 'gif' | null;
  file_name: string | null;
  read: boolean;
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'friend_request' | 'message' | 'friend_accepted';
  content: string;
  related_id: string | null;
  read: boolean;
  created_at: string;
}
