import { styled } from "styled-components";
import { ITweet } from "./timeline";
import { FONTS } from "../constants/font";
import { auth, db, storage } from "../firebase";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import React, { useEffect, useRef, useState } from "react";
import { EditButton, TextArea, AttachFileInput } from "./common-components";

const Wrapper = styled.div`
  display: grid;
  grid-template-columns: 3fr 1fr;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 15px;
`;

const Column = styled.div``;

const EditTextArea = styled(TextArea)`
  margin-right: 20px;
  margin-bottom: 20px;
  width: 95%;
`;

const Photo = styled.img`
  width: 200px;
  height: 200px;
  border-radius: 15px;
`;

const Username = styled.span`
  display: block;
  font-weight: ${FONTS.semiBold};
  font-size: normal;
  margin-bottom: 10px;
`;

const Payload = styled.p`
  margin: 10px 0px;
  font-size: ${FONTS.large};
`;

const DeleteTweetButton = styled(EditButton)`
  margin-right: 15px;
`;

const EditTweetButton = styled(EditButton)``;

const ChangeFileInput = styled(AttachFileInput)``;

const ChangeFileButton = styled(EditButton)`
  margin-right: 15px;
`;

const UndoFileChangeButton = styled(EditButton)`
  margin-bottom: 20px;
`;

export default function Tweet({ username, photo, tweet, userId, id }: ITweet) {
  const user = auth.currentUser;
  const [edit, setEdit] = useState(false);
  const [editTweet, setEditTweet] = useState(tweet);
  const [file, setFile] = useState<File | null>(null);
  const [originalPhoto, setOriginalPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOriginalPhoto(photo || null);
  }, [photo]);

  const onDelete = async () => {
    const ok = confirm("Are you sure delete this tweet?");
    if (!ok || user?.uid !== userId) return;
    try {
      await deleteDoc(doc(db, "tweets", id));
      if (photo) {
        const photoRef = ref(storage, `tweets/${user.uid}/${id}`);
        await deleteObject(photoRef);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const onTweetChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditTweet(e.target.value);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    const maxSize = 1024 * 768;
    if (files && files.length === 1 && files[0].size <= maxSize) {
      const newFile = files[0];
      setFile(newFile);

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataURL = e.target?.result as string;
        setOriginalPhoto(dataURL);
      };
      reader.readAsDataURL(newFile);
    } else {
      alert("Please upload a picture smaller than 1 MB.");
      setFile(null);
    }
  };

  const onEdit = async () => {
    setEdit(true);
    if (!edit || !user) return;

    try {
      if (file) {
        const locationRef = ref(storage, `tweets/${user.uid}/${id}`);
        const result = await uploadBytes(locationRef, file);
        const url = await getDownloadURL(result.ref);
        setOriginalPhoto(url);
        await updateDoc(doc(db, "tweets", id), {
          photo: url,
        });
      }

      await updateDoc(doc(db, "tweets", id), {
        tweet: editTweet,
      });
    } catch (e) {
      console.log(e);
    } finally {
      setEdit(false);
    }
  };

  // useEffect(() => {
  //   const handleClick = (event: MouseEvent) => {
  //     if (edit && !fileInputRef.current?.contains(event.target as Node)) {
  //       setEdit(false);
  //     }
  //   };

  //   document.addEventListener("mousedown", handleClick);

  //   return () => {
  //     document.removeEventListener("mousedown", handleClick);
  //   };
  // }, [edit]);

  return (
    <Wrapper>
      <Column>
        <Username>{username}</Username>
        {edit ? (
          <EditTextArea
            rows={5}
            maxLength={180}
            onChange={onTweetChange}
            value={editTweet}
          />
        ) : (
          <Payload>{tweet}</Payload>
        )}
        {user?.uid === userId ? (
          <>
            <DeleteTweetButton onClick={onDelete}>Delete</DeleteTweetButton>
            <EditTweetButton onClick={onEdit}>
              {edit ? "Save" : "Edit"}
            </EditTweetButton>
          </>
        ) : null}
      </Column>
      <Column>
        {edit ? (
          <>
            <ChangeFileButton onClick={() => fileInputRef.current?.click()}>
              {originalPhoto ? "Edit Photo" : "Add Photo"}
            </ChangeFileButton>
            <UndoFileChangeButton onClick={() => setEdit(false)}>
              Cancel
            </UndoFileChangeButton>
            <ChangeFileInput
              ref={fileInputRef}
              onChange={onFileChange}
              id="file"
              accept="image/*"
              type="file"
            />
            {originalPhoto && <Photo src={originalPhoto} />}
          </>
        ) : (
          originalPhoto && <Photo src={originalPhoto} />
        )}
      </Column>
    </Wrapper>
  );
}
