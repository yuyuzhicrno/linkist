import { initDatabase, getRepository } from './data/db.js';
import { UserService } from './dist/services/UserService.js';
import { PostService } from './dist/services/PostService.js';
import { ChannelService } from './dist/services/ChannelService.js';
import { FriendService } from './dist/services/FriendService.js';
import { NotificationService } from './dist/services/NotificationService.js';
import { PollService } from './dist/services/PollService.js';
import { TagService } from './dist/services/TagService.js';

export let services = {};

export async function initServices() {
  const repo = await getRepository();
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

export function getServices() {
  return services;
}