export type TelegramUser = {
  id: number;
  is_bot: boolean;
  username?: string;
  first_name?: string;
};

export type TelegramChat = {
  id: number;
  type: string;
  title?: string;
};

export type TelegramFileRef = {
  file_id: string;
  file_size?: number;
  mime_type?: string;
  duration?: number;
};

export type TelegramPhotoSize = {
  file_id: string;
  file_size?: number;
  width: number;
  height: number;
};

export type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
  caption?: string;
  video?: TelegramFileRef;
  video_note?: TelegramFileRef;
  animation?: TelegramFileRef;
  document?: TelegramFileRef;
  photo?: TelegramPhotoSize[];
  reply_to_message?: TelegramMessage;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

export type BotIdentity = {
  id: number;
  username: string;
};

export type BotCommand = {
  command: string;
  description: string;
};
