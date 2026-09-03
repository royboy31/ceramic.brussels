import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  Grid,
  Heading,
  Inline,
  Select,
  Spinner,
  Stack,
  Text,
  TextInput,
} from '@sanity/ui';
// @sanity/ui v4 splits its entry points; the toast API is its own subpath.
import { useToast } from '@sanity/ui/toast';

/**
 * The Users screen, inside the Studio.
 *
 * These accounts are not Sanity project members - they live in D1, which is
 * private, unlike this dataset. That distinction is the whole reason the
 * screen exists: the production dataset answers queries with no credentials
 * at all, so anything holding a password hash cannot be a document in it.
 *
 * Everything here goes through /api/users on the same origin. Managing users
 * needs its own sign-in because the API trusts a D1 session, not the Sanity
 * one - a Sanity login says who you are to Sanity, and says nothing about
 * whether you may administer these accounts.
 */

/** Navbar glyph. Local rather than from @sanity/icons, whose export surface
 *  is a transitive dependency this project does not control. */
export function UsersToolIcon() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 25 25" fill="none" stroke="currentColor" strokeWidth="1.2">
      <circle cx="10" cy="9" r="3.2" />
      <path d="M4.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <circle cx="17" cy="8" r="2.4" />
      <path d="M15.5 13.6c.5-.2 1-.3 1.5-.3 2.4 0 4 1.6 4 4" />
    </svg>
  );
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      'x-admin-request': '1',
      ...(options.headers ?? {}),
    },
    credentials: 'same-origin',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { error?: string }).error ?? `Failed (${response.status})`);
  return body as T;
}

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export function UsersTool() {
  const [me, setMe] = useState<User | null>(null);
  const [users, setUsers] = useState<User[] | null>(null);
  const toast = useToast();
  const say = useCallback(
    (status: 'error' | 'success', title: string) => toast.push({ status, title, duration: 6000 }),
    [toast],
  );
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState<User | null>(null);
  const [changing, setChanging] = useState(false);

  const load = useCallback(async () => {
    try {
      const { user } = await api<{ user: User | null }>('/api/auth/session');
      setMe(user);
      if (user?.role === 'admin') {
        const { users: list } = await api<{ users: User[] }>('/api/users');
        setUsers(list);
      } else {
        setUsers(null);
      }
    } catch (error) {
      say('error', (error as Error).message);
    }
  }, [say]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = useCallback(
    async (action: () => Promise<unknown>, ok: string) => {
      setBusy(true);
      try {
        await action();
        say('success', ok);
        await load();
      } catch (error) {
        say('error', (error as Error).message);
      }
      setBusy(false);
    },
    [load],
  );

  if (!me) return <SignIn onDone={load} say={say} />;

  // A forced change blocks every other endpoint, so it has to be dealt with
  // before anything else can load. Accounts are created with the flag set, so
  // this is the normal first run for everyone but the first admin.
  if (me.mustChangePassword || changing) {
    return (
      <ChangePassword
        forced={me.mustChangePassword}
        onCancel={() => setChanging(false)}
        onDone={async () => {
          setChanging(false);
          say('success', 'Password changed.');
          await load();
        }}
        onError={(text) => say('error', text)}
      />
    );
  }

  if (me.role !== 'admin') {
    return (
      <Box padding={4}>
        <Card tone="caution" padding={4} radius={2} border>
          <Text>
            Signed in as {me.name}. Only an admin can manage users.
          </Text>
        </Card>
      </Box>
    );
  }

  return (
    <Box padding={4}>
      <Stack space={4}>
        <Flex align="center" justify="space-between">
          <Heading size={2}>Users</Heading>
          <Inline space={2}>
            <Text size={1} muted>
              signed in as {me.name}
            </Text>
            <Button mode="bleed" text="Change password" fontSize={1} onClick={() => setChanging(true)} />
            <Button
              mode="bleed"
              text="Sign out"
              fontSize={1}
              onClick={() =>
                run(() => api('/api/auth/logout', { method: 'POST' }).then(() => setMe(null)), 'Signed out.')
              }
            />
          </Inline>
        </Flex>

        <Card padding={3} radius={2} tone="primary" border>
          <Text size={1}>
            These accounts are for this site only. They are not Sanity logins and cost no Sanity
            seat. Every content change made with one is recorded against the person who made it.
          </Text>
        </Card>

        {!users ? (
          <Flex justify="center" padding={5}>
            <Spinner muted />
          </Flex>
        ) : (
          <Stack space={2}>
            {users.map((user) => (
              <Card key={user.id} padding={3} radius={2} border tone={user.isActive ? 'default' : 'transparent'}>
                <Flex align="center" justify="space-between" gap={3} wrap="wrap">
                  <Stack space={2}>
                    <Inline space={2}>
                      <Text weight="semibold">{user.name}</Text>
                      <Badge tone={user.role === 'admin' ? 'primary' : 'default'} fontSize={0}>
                        {user.role}
                      </Badge>
                      {!user.isActive && (
                        <Badge tone="critical" fontSize={0}>
                          deactivated
                        </Badge>
                      )}
                      {user.mustChangePassword && (
                        <Badge tone="caution" fontSize={0}>
                          must set password
                        </Badge>
                      )}
                    </Inline>
                    <Text size={1} muted>
                      {user.email} · last sign-in {formatDate(user.lastLoginAt)}
                    </Text>
                  </Stack>

                  <Inline space={2}>
                    <Button
                      mode="ghost"
                      fontSize={1}
                      disabled={busy}
                      text={user.role === 'admin' ? 'Make editor' : 'Make admin'}
                      onClick={() =>
                        run(
                          () =>
                            api(`/api/users/${user.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ role: user.role === 'admin' ? 'editor' : 'admin' }),
                            }),
                          'Role updated.',
                        )
                      }
                    />
                    <Button
                      mode="ghost"
                      fontSize={1}
                      disabled={busy}
                      text="Reset password"
                      onClick={() => setResetting(user)}
                    />
                    <Button
                      mode="ghost"
                      fontSize={1}
                      disabled={busy}
                      text={user.isActive ? 'Deactivate' : 'Reactivate'}
                      onClick={() =>
                        run(
                          () =>
                            api(`/api/users/${user.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ isActive: !user.isActive }),
                            }),
                          user.isActive ? 'Account deactivated.' : 'Account reactivated.',
                        )
                      }
                    />
                    <Button
                      mode="ghost"
                      tone="critical"
                      fontSize={1}
                      disabled={busy}
                      text="Delete"
                      onClick={() => {
                        if (!window.confirm(`Delete ${user.name}? Their activity log entries are kept.`)) return;
                        void run(() => api(`/api/users/${user.id}`, { method: 'DELETE' }), 'User deleted.');
                      }}
                    />
                  </Inline>
                </Flex>
              </Card>
            ))}
          </Stack>
        )}

        <CreateUser busy={busy} onCreate={(body) => run(() => api('/api/users', { method: 'POST', body }), 'User created.')} />
      </Stack>

      {resetting && (
        <ResetPassword
          user={resetting}
          onClose={() => setResetting(null)}
          onSubmit={(password) => {
            setResetting(null);
            return run(
              () => api(`/api/users/${resetting.id}`, { method: 'POST', body: JSON.stringify({ password }) }),
              `Password reset. ${resetting.name} must choose a new one at next sign-in.`,
            );
          }}
        />
      )}
    </Box>
  );
}

function ChangePassword(props: {
  forced: boolean;
  onCancel: () => void;
  onDone: () => void;
  onError: (text: string) => void;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <Box padding={4}>
      <Card padding={4} radius={2} border style={{ maxWidth: 460 }}>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (next !== confirm) return props.onError('The two new passwords do not match.');
            setBusy(true);
            try {
              await api('/api/auth/password', {
                method: 'POST',
                body: JSON.stringify({ currentPassword: current, newPassword: next }),
              });
              props.onDone();
            } catch (error) {
              props.onError((error as Error).message);
            }
            setBusy(false);
          }}
        >
          <Stack space={4}>
            <Heading size={1}>{props.forced ? 'Choose your password' : 'Change password'}</Heading>
            {props.forced && (
              <Text size={1} muted>
                This account was created with a temporary password. Pick your own to continue - the
                temporary one stops working straight away.
              </Text>
            )}
            <Stack space={2}>
              <Text size={1}>Current password</Text>
              <TextInput type="password" value={current} onChange={(e) => setCurrent(e.currentTarget.value)} required />
            </Stack>
            <Stack space={2}>
              <Text size={1}>New password</Text>
              <TextInput type="password" value={next} onChange={(e) => setNext(e.currentTarget.value)} required />
            </Stack>
            <Stack space={2}>
              <Text size={1}>Repeat new password</Text>
              <TextInput type="password" value={confirm} onChange={(e) => setConfirm(e.currentTarget.value)} required />
            </Stack>
            <Text size={1} muted>
              At least 12 characters. A passphrase of a few words beats a short password with
              symbols in it.
            </Text>
            <Flex gap={2}>
              <Button type="submit" text="Save password" tone="primary" disabled={busy} />
              {!props.forced && <Button mode="bleed" text="Cancel" onClick={props.onCancel} />}
            </Flex>
          </Stack>
        </form>
      </Card>
    </Box>
  );
}

function SignIn(props: { onDone: () => void; say: (status: 'error' | 'success', title: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <Box padding={4}>
      <Card padding={4} radius={2} border style={{ maxWidth: 420 }}>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            try {
              await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
              props.onDone();
            } catch (error) {
              props.say('error', (error as Error).message);
            }
            setBusy(false);
          }}
        >
          <Stack space={4}>
            <Heading size={1}>Sign in to manage users</Heading>
            <Text size={1} muted>
              A Sanity login says who you are to Sanity. These accounts are separate, so managing
              them asks for its own credentials.
            </Text>
            <Stack space={2}>
              <Text size={1}>Email</Text>
              <TextInput type="email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} required />
            </Stack>
            <Stack space={2}>
              <Text size={1}>Password</Text>
              <TextInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
              />
            </Stack>
            <Button type="submit" text="Sign in" tone="primary" disabled={busy} />
          </Stack>
        </form>
      </Card>
    </Box>
  );
}

function CreateUser(props: { busy: boolean; onCreate: (body: string) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'admin'>('editor');
  const [password, setPassword] = useState('');

  return (
    <Card padding={4} radius={2} border>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          props.onCreate(JSON.stringify({ name, email, role, password }));
          setName('');
          setEmail('');
          setPassword('');
        }}
      >
        <Stack space={4}>
          <Heading size={1}>Add a user</Heading>
          <Grid columns={[1, 1, 4]} gap={3}>
            <Stack space={2}>
              <Text size={1}>Name</Text>
              <TextInput value={name} onChange={(e) => setName(e.currentTarget.value)} required />
            </Stack>
            <Stack space={2}>
              <Text size={1}>Email</Text>
              <TextInput type="email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} required />
            </Stack>
            <Stack space={2}>
              <Text size={1}>Role</Text>
              <Select value={role} onChange={(e) => setRole(e.currentTarget.value as 'editor' | 'admin')}>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </Select>
            </Stack>
            <Stack space={2}>
              <Text size={1}>Temporary password</Text>
              <TextInput value={password} onChange={(e) => setPassword(e.currentTarget.value)} required />
            </Stack>
          </Grid>
          <Text size={1} muted>
            At least 12 characters. They are required to choose their own the first time they sign
            in, so this one stops working immediately.
          </Text>
          <Flex>
            <Button type="submit" text="Create user" tone="primary" disabled={props.busy} />
          </Flex>
        </Stack>
      </form>
    </Card>
  );
}

function ResetPassword(props: { user: User; onClose: () => void; onSubmit: (password: string) => void }) {
  const [password, setPassword] = useState('');
  return (
    <Dialog id="reset-password" header={`Reset password for ${props.user.name}`} onClose={props.onClose} width={1}>
      <Box padding={4}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            props.onSubmit(password);
          }}
        >
          <Stack space={4}>
            <Text size={1} muted>
              At least 12 characters. They will be asked to choose their own at next sign-in, and
              every session they currently have is ended.
            </Text>
            <TextInput
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              placeholder="Temporary password"
              required
            />
            <Flex gap={2}>
              <Button type="submit" text="Reset" tone="critical" />
              <Button mode="bleed" text="Cancel" onClick={props.onClose} />
            </Flex>
          </Stack>
        </form>
      </Box>
    </Dialog>
  );
}
