import SocialPost from '../models/SocialPost.js';
import { publishSocialPost } from '../controllers/socialController.js';

let timer = null;

const tick = async () => {
  const due = await SocialPost.find({
    status: 'scheduled',
    scheduledAt: { $lte: new Date() },
  }).limit(5);

  for (const post of due) {
    const locked = await SocialPost.findOneAndUpdate(
      { _id: post._id, status: 'scheduled' },
      { status: 'publishing' },
      { new: true }
    );
    if (!locked) continue;
    try {
      await publishSocialPost(locked);
    } catch (err) {
      locked.status = 'failed';
      locked.errorMessage = err.message;
      await locked.save();
    }
  }
};

export const startSocialScheduler = () => {
  if (timer) return;
  timer = setInterval(() => {
    tick().catch((err) => console.error('Social scheduler:', err.message));
  }, 60 * 1000);
};
