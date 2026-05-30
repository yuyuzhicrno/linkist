import { initDatabase, getRepository } from './data/db.js';
import { UserService, PostService, ChannelService, FriendService, NotificationService, PollService, TagService } from './services/index.js';

export let services = {};

export async function initServices() {
  const repo = await getRepository();
  const userService = new UserService(repo);
  const postService = new PostService(repo, userService);
  services = {
    user: userService,
    post: postService,
    channel: new ChannelService(repo),
    friend: new FriendService(repo),
    notification: new NotificationService(),
    poll: new PollService(repo),
    tag: new TagService(repo)
  };
  return services;
}

export function getServices() {
  return services;
}