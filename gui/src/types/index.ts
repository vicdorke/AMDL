/** 类型定义 */

export interface TaskInfo {
  id: string;
  urls: string[];
  cookies_path: string;
  output_path: string;
  codec_song: string;
  codec_music_video: string;
  audio_format: string | null;
  video_format: string | null;
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  completed: number;
  total: number;
  error_count: number;
  last_error?: string;
}

export interface Config {
  output_path: string;
  temp_path: string;
  cookies_path?: string;
  download_lyrics?: boolean;
  folder_style?: string;
  file_name_order?: string[];
  codec_song: string;
  codec_music_video: string;
  cover_format: string;
  cover_size: number;
  synced_lyrics_format: string;
  download_mode: string;
  audio_format: string | null;
  video_format: string | null;
  language: string;
  theme: 'dark' | 'light';
  save_cover: boolean;
  save_playlist: boolean;
  overwrite: boolean;
  template_folder_album: string;
  template_folder_compilation: string;
  template_file_single_disc: string;
  template_file_multi_disc: string;
  template_folder_no_album: string;
  template_file_no_album: string;
  template_file_playlist: string;
  truncate: number | null;
  exclude_tags: string | null;
}

export interface ApiInfo {
  api_version: string;
  wvd_available?: boolean;
  supported_codecs_song: { value: string; label: string }[];
  supported_codecs_music_video: { value: string; label: string }[];
  supported_cover_formats: { value: string; label: string }[];
  supported_synced_lyrics_formats: { value: string; label: string }[];
  supported_uploaded_video_qualities: { value: string; label: string }[];
  supported_download_modes: { value: string; label: string }[];
  supported_audio_conversion_formats: string[];
  supported_video_conversion_formats: string[];
}

export interface WsMessage {
  type: 'status' | 'progress' | 'log' | 'done' | 'error';
  status?: string;
  progress?: number;
  completed?: number;
  total?: number;
  error_count?: number;
  message?: string;
  error?: string;
  last_error?: string;
}

export interface DownloadRequest {
  urls: string[];
  cookies_path: string;
  output_path?: string;
  codec_song?: string;
  codec_music_video?: string;
  audio_format?: string | null;
  video_format?: string | null;
  save_cover?: boolean;
  save_playlist?: boolean;
  overwrite?: boolean;
}
