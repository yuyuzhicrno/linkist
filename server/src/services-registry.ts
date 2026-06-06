import { initDatabase, getRepository } from './data/db';
import type { Repository } from './repository/index';
import { UserService } from './services/UserService';
import { PostService } from './services/PostService';
import { ChannelService } from './services/ChannelService';
import { FriendService } from './services/FriendService';
import { NotificationService } from './services/NotificationService';
import { PollService } from './services/PollService';
import { TagService } from './services/TagService';
import { ColumnService } from './services/ColumnService';
import { DebateService } from './services/DebateService';

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

export let services: Services = {} as Services;

export async function initServices() {
  await initDatabase();
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
    tag: new TagService(repo),
    column: new ColumnService(repo),
    debate: new DebateService(repo)
  };
  return services;
}

export function getServices(): Services {
  return services;
}