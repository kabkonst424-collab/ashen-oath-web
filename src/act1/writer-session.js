/** One save writer per origin. Waiting tabs recover when the current tab leaves. */
export class WriterSession {
  constructor({locks = globalThis.navigator?.locks, name = 'ashen-oath-act1-writer', onChange = () => {}} = {}) {
    this.locks = locks;
    this.name = name;
    this.onChange = onChange;
    this.owned = false;
    this.error = null;
    this.session = null;
  }

  acquire() {
    if (this.session) return this.session.initial;
    const session = {controller: new AbortController(), queued: false, releaseHold: null};
    session.initial = new Promise(resolve => { session.resolveInitial = resolve; });
    this.session = session;
    this.error = null;
    this.owned = false;
    if (this.locks == null) {
      // The save store still uses its revision compare-and-swap on these browsers.
      this.owned = true;
      session.resolveInitial(true);
      this.notify(session, true);
      return session.initial;
    }
    // The specification forbids combining signal with ifAvailable. A late probe
    // callback simply returns after release; it never grants stale ownership.
    this.request(session, {ifAvailable: true}, lock => {
      if (this.session !== session) return;
      if (lock) return this.hold(session);
      session.resolveInitial(false);
      this.notify(session, false);
      if (this.session === session) this.queue(session);
    });
    return session.initial;
  }

  request(session, options, callback) {
    try {
      Promise.resolve(this.locks.request(this.name, options, callback))
        .catch(error => this.fail(session, error));
    } catch (error) { this.fail(session, error); }
  }

  queue(session) {
    if (session.queued || this.session !== session) return;
    session.queued = true;
    this.request(session, {signal: session.controller.signal}, lock => {
      if (this.session !== session) return;
      if (!lock) { this.fail(session, new Error('Save writer lock was not granted')); return; }
      return this.hold(session);
    });
  }

  hold(session) {
    const held = new Promise(resolve => { session.releaseHold = resolve; });
    this.owned = true;
    session.resolveInitial(true);
    this.notify(session, true);
    return held;
  }

  notify(session, owned) {
    try {
      Promise.resolve(this.onChange(owned)).catch(error => {
        if (this.session === session) this.error = error;
      });
    } catch (error) { if (this.session === session) this.error = error; }
  }

  fail(session, error) {
    if (this.session !== session) return;
    this.error = error instanceof Error ? error : new Error(String(error));
    this.owned = false;
    session.resolveInitial(false);
    session.releaseHold?.();
    session.controller.abort();
    this.notify(session, false);
    if (this.session === session) this.session = null;
  }

  release() {
    const session = this.session;
    this.session = null;
    this.owned = false;
    if (!session) return;
    session.resolveInitial(false);
    session.controller.abort();
    session.releaseHold?.();
  }
}
