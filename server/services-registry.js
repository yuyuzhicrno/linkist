import { getRepository } from './data/db.js';

export let services = {};

export async function initServerServices() {
  const repo = await getRepository();
  
  const { UserService } = await import('./dist/services/UserService.js');
  const { PostService } = await import('./dist/services/PostService.js');
  const { ChannelService } = await import('./dist/services/ChannelService.js');
  const { FriendService } = await import('./dist/services/FriendService.js');
  const { NotificationService } = await import('./dist/services/NotificationService.js');
  const { PollService } = await import('./dist/services/PollService.js');
  const { TagService } = await import('./dist/services/TagService.js');
  const { ColumnService } = await import('./dist/services/ColumnService.js');

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

export function getServices() {
  return services;
}