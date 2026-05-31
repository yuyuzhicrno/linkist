import type { Repository } from '../repository';
import { UserService } from './UserService';
import { PostService } from './PostService';
import { ChannelService } from './ChannelService';
import { FriendService } from './FriendService';
import { NotificationService } from './NotificationService';
import { PollService } from './PollService';
import { TagService } from './TagService';
import { ColumnService } from './ColumnService';

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
}

export let services: Services = {
  repo: null as unknown as Repository,
  user: null as unknown as UserService,
  post: null as unknown as PostService,
  channel: null as unknown as ChannelService,
  friend: null as unknown as FriendService,
  notification: null as unknown as NotificationService,
  poll: null as unknown as PollService,
  tag: null as unknown as TagService,
  column: null as unknown as ColumnService
};

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
    column: new ColumnService(repo)
  };
  
  return services;
}

export function getServices(): Services {
  return services;
}