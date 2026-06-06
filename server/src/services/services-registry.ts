import type { Repository } from '../repository';
import { UserService } from './UserService';
import { PostService } from './PostService';
import { ChannelService } from './ChannelService';
import { FriendService } from './FriendService';
import { NotificationService } from './NotificationService';
import { PollService } from './PollService';
import { TagService } from './TagService';
import { ColumnService } from './ColumnService';
import { DebateService } from './DebateService';

export interface Services {
  repo: Repository;
  user: UserService;
  post: PostService;
  channel: ChannelService;
  friend: FriendService;
  notification: NotificationService;
  poll: PollService;
  tag: TagService;
  column: ColumnService;
  debate: DebateService;
}

// Initial placeholder - will be replaced by initServices
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PLACEHOLDER_SERVICES: Services = null as any;

export let services: Services = PLACEHOLDER_SERVICES;

export async function initServices(repo: Repository): Promise<Services> {
  const userService = new UserService(repo);
  const postService = new PostService(repo, userService);
  
  services = {
    repo,
    user: userService,
    post: postService,
    channel: new ChannelService(repo),
    friend: new FriendService(repo),
    notification: new NotificationService(repo),
    poll: new PollService(repo),
    tag: new TagService(repo),
    column: new ColumnService(repo),
    debate: new DebateService(repo)
  };
  
  return services;
}

export function getServices(): Services {
  return services;
}