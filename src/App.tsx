import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';

import { Amplify } from 'aws-amplify';
import config from '../amplify_outputs.json';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { uploadData, getUrl, remove } from 'aws-amplify/storage';
import './App.css';

Amplify.configure(config);

type Note = {
  id: string;
  name: string | null;
  description: string | null;
  image?: string | null;
  imageUrl?: string;
  owner?: string | null;
  createdAt: string;
  updatedAt: string;
};

const client = generateClient<Schema>();

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);

  async function fetchNotes() {
    const { data } = await client.models.Note.list();
    const withImages = await Promise.all(
      data.map(async (note) => {
        let imageUrl;
        if (note.image) {
          const url = await getUrl({ key: note.image });
          imageUrl = url.url.toString();
        }
        return { ...note, imageUrl };
      })
    );
    setNotes(withImages);
  }

  async function createNote(e: FormEvent) {
    e.preventDefault();
    let imageKey;

    if (image) {
      const uploadResult = await uploadData({
        key: image.name,
        data: image,
      }).result;
      imageKey = uploadResult.key;
    }

    await client.models.Note.create({
      name,
      description,
      image: imageKey,
    });

    setName('');
    setDescription('');
    setImage(null);
    fetchNotes();
  }

  async function deleteNote(id: string, image?: string) {
    await client.models.Note.delete({ id });
    if (image) {
      await remove({ key: image });
    }
    fetchNotes();
  }

  useEffect(() => {
    fetchNotes();
  }, []);

  return (
    <Authenticator>
      {({ signOut, user }) => {
        const realUser = user as any;
        const displayName =
          realUser?.attributes?.name ||
          realUser?.attributes?.email ||
          user?.username;

        return (
          <div className="app">
            <header className="header">
              <h1>📝 Notes App</h1>
              <div className="user-info">
                <span>Hello, {displayName}</span>
                <button className="signout" onClick={signOut}>Sign out</button>
              </div>
            </header>

            <form className="note-form" onSubmit={createNote}>
              <input
                type="text"
                placeholder="Title"
                value={name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                required
              />
              <textarea
                placeholder="Description"
                value={description}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                required
              />
              <input
                type="file"
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setImage(e.target.files?.[0] || null)
                }
              />
              <button type="submit">Add Note</button>
            </form>

            <div className="notes-container">
              {notes.length === 0 ? (
                <p className="empty">No notes yet.</p>
              ) : (
                notes.map((note) => (
                  <div className="note-card" key={note.id}>
                    <h3>{note.name}</h3>
                    <p>{note.description}</p>
                    {note.imageUrl && (
                      <img
                        className="note-image"
                        src={note.imageUrl}
                        alt="Note"
                      />
                    )}
                    <button onClick={() => deleteNote(note.id, note.image || undefined)}>Delete</button>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      }}
    </Authenticator>
  );
}
