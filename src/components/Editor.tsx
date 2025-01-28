"use client";

import { FC, useCallback, useRef } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { useForm } from "react-hook-form";
import { PostCreationPayload, PostValidator } from "@/lib/validators/post";
import { zodResolver } from "@hookform/resolvers/zod";
import type EditorJS from "@editorjs/editorjs";
import AWS from "aws-sdk";
import { toast } from "@/hooks/use-toast";

interface EditorProps {
  subredditId: string;
}

const Editor: FC<EditorProps> = ({ subredditId }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PostCreationPayload>({
    resolver: zodResolver(PostValidator),
    defaultValues: {
      subredditId,
      title: "",
      content: null,
    },
  });

  const ref = useRef<EditorJS>();

  const initializeEditor = useCallback(async () => {
    const EditorJS = (await import("@editorjs/editorjs")).default;
    const Header = (await import("@editorjs/header")).default;
    const Embed = (await import("@editorjs/embed")).default;
    const Table = (await import("@editorjs/table")).default;
    const List = (await import("@editorjs/list")).default;
    const Code = (await import("@editorjs/code")).default;
    const LinkTool = (await import("@editorjs/link")).default;
    const InlineCode = (await import("@editorjs/inline-code")).default;
    const ImageTool = (await import("@editorjs/image")).default;

    if (!ref.current) {
      const editor = new EditorJS({
        holder: "editor",
        onReady() {
          ref.current = editor;
        },
        placeholder: "Type here to write your post...",
        inlineToolbar: true,
        data: { blocks: [] },
        tools: {
          header: Header,
          linkTool: {
            class: LinkTool,
            config: {
              endPoint: "/api/link",
            },
          },
          image: {
            class: ImageTool,
            config: {
              uploader: {
                async uploadByFile(file: File) {
                  const formData = new FormData();
                  formData.append("image", file);

                  AWS.config.update({
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    region: process.env.AWS_REGION,
                  });

                  const s3 = new AWS.S3();

                  const params = {
                    Bucket: process.env.S3_BUCKET as string,
                    Key: file.name,
                    Body: file,
                    ContentType: file.type,
                  };

                  const upload = s3
                    .upload(params)
                    .on("httpUploadProgress", (evt) => {
                      console.log(
                        "Uploading " +
                          parseInt(
                            String((evt.loaded * 100) / (evt.total || 1))
                          ) +
                          "%"
                      );
                    })
                    .promise();

                  await upload
                    .then(() => {
                      return toast({
                        title: "File Uploaded!",
                        description: "Your file was uploaded successfully.",
                      });
                    })
                    .catch(() => {
                      return toast({
                        title: "Failed to Upload File!",
                        description: "There was an error uploading your file.",
                        variant: "destructive",
                      });
                    });
                },
              },
            },
          },
        },
      });
    }
  }, []);

  return (
    <div className="w-full p-4 bg-zinc-50 rounded-lg border border-zinc-200 ">
      <form id="subreddit-post-form" className="w-fit" onSubmit={() => {}}>
        <div className="prose prose-stone dark:prose-invert">
          <TextareaAutosize
            placeholder="Title"
            className="w-full resize-none appearance-none overflow-hidden bg-transparent text-5xl font-bold focus:outline-none"
          />
        </div>
      </form>
    </div>
  );
};

export default Editor;
