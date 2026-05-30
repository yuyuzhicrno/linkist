import { initDatabase, getRepository } from '../data/db.js';
import type { Repository } from './repository/index.js';
import { UserService } from './services/UserService.js';
import { PostService } from './services/PostService.js';
import { ChannelService } from './services/ChannelService.js';
import { FriendService } from './services/FriendService.js';
import { NotificationService } from './services/NotificationService.js';
import { PollService } from './services/PollService.js';
import { TagService } from './services/TagService.js';

export interface Services {
  repo: Repository;
  user: UserService;
  post: PostService;
  channel: ChannelService;
  friend: FriendService;
  notification: NotificationService;
  poll: PollService;
  tag: TagService;
}

export let services: Services = {} as Services;

export async function initServices() {
  const repo = await getRepository() as Repository;
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
    tag: new TagService(repo)
  };
  return services;
}

export function getServices(): Services {
  return services;
}