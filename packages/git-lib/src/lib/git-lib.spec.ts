import { gitLib } from './git-lib.js';

describe('gitLib', () => {
  it('should work', () => {
    expect(gitLib()).toEqual('git-lib');
  });
});
