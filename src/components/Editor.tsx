"use client";

import { FC, useCallback, useEffect, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { useForm, Controller } from "react-hook-form";
import { PostCreationRequest, PostValidator } from "@/lib/validators/post";
import { zodResolver } from "@hookform/resolvers/zod";
import type EditorJS from "@editorjs/editorjs";
import AWS from "aws-sdk";
import { toast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { usePathname, useRouter } from "next/navigation";
import "@/styles/editor.css";

interface EditorProps {
  subredditId: string;
}

const Editor: FC<EditorProps> = ({ subredditId }) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PostCreationRequest>({
    resolver: zodResolver(PostValidator),
    defaultValues: {
      subredditId,
      title: "",
      content: null,
    },
  });

  const pathname = usePathname();
  const router = useRouter();
  const ref = useRef<EditorJS>();
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const _titleRef = useRef<HTMLTextAreaElement>(null);

  const initializeEditor = useCallback(async () => {
    if (!isMounted || ref.current) return;

    const EditorJS = (await import("@editorjs/editorjs")).default;
    const Header = (await import("@editorjs/header")).default;
    const Embed = (await import("@editorjs/embed")).default;
    const Table = (await import("@editorjs/table")).default;
    const List = (await import("@editorjs/list")).default;
    const Code = (await import("@editorjs/code")).default;
    const LinkTool = (await import("@editorjs/link")).default;
    const InlineCode = (await import("@editorjs/inline-code")).default;
    const ImageTool = (await import("@editorjs/image")).default;

    ref.current = new EditorJS({
      holder: "editor",
      placeholder: "Type here to write your post...",
      inlineToolbar: true,
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
                try {
                  AWS.config.update({
                    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY,
                    secretAccessKey:
                      process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
                    region: process.env.NEXT_PUBLIC_AWS_REGION,
                  });

                  const s3 = new AWS.S3();
                  const params = {
                    Bucket: process.env.NEXT_PUBLIC_S3_BUCKET as string,
                    Key: `uploads/${Date.now()}-${file.name}`,
                    Body: file,
                    ContentType: file.type,
                  };

                  const upload = await s3.upload(params).promise();

                  toast({
                    title: "File Uploaded!",
                    description: "Your file was uploaded successfully.",
                  });

                  return {
                    success: 1,
                    file: {
                      url: upload.Location,
                    },
                  };
                } catch (error) {
                  toast({
                    title: "Failed to Upload File!",
                    description: "There was an error uploading your file.",
                    variant: "destructive",
                  });

                  return { success: 0 };
                }
              },
            },
          },
        },
        list: List,
        code: Code,
        inlineCode: InlineCode,
        table: Table,
        embed: Embed,
      },
    });
  }, [isMounted]);

  useEffect(() => {
    initializeEditor();
    setTimeout(() => {
      _titleRef.current?.focus();
    }, 0);

    return () => {
      ref.current?.destroy();
      ref.current = undefined;
    };
  }, [initializeEditor]);

  useEffect(() => {
    if (Object.keys(errors).length) {
      for (const [_key, value] of Object.entries(errors)) {
        console.log(value);
        value;
        toast({
          title: "Something went wrong!",
          description: (value as { message: string }).message,
          variant: "destructive",
        });
      }
    }
  }, [errors]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { mutate: createPost } = useMutation({
    mutationFn: async ({
      title,
      content,
      subredditId,
    }: PostCreationRequest) => {
      const payload: PostCreationRequest = {
        title,
        content,
        subredditId,
      };

      const { data } = await axios.post("/api/subreddit/post/create", payload);
      return data;
    },
    onError: () => {
      return toast({
        title: "Failed to create post!",
        description: "There was an error creating your post.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      const newPathname = pathname.split("/").slice(0, -1).join("/");

      router.push(newPathname);
      router.refresh();

      return toast({
        title: "Post created successfully!",
        description: "Your post has been created successfully.",
      });
    },
  });

  async function onSubmit(data: PostCreationRequest) {
    const blocks = await ref.current?.save();

    const payload: PostCreationRequest = {
      title: data.title,
      content: blocks,
      subredditId,
    };

    createPost(payload);
  }

  const { ref: titleRef, ...rest } = register("title");

  return (
    <div className="w-full p-4 bg-zinc-50 rounded-lg border border-zinc-200">
      <form
        id="subreddit-post-form"
        className="w-fit"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="prose prose-stone dark:prose-invert">
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <TextareaAutosize
                {...field}
                placeholder="Title"
                className="w-full resize-none appearance-none overflow-hidden bg-transparent text-5xl font-bold focus:outline-none"
                ref={(e) => {
                  field.ref(e);
                  //@ts-ignore
                  _titleRef.current = e;
                }}
              />
            )}
          />
          <div id="editor" className="min-h-[500px]" />
          <p className="text-sm text-gray-500">
            Use{" "}
            <kbd className="rounded-md border bg-muted px-1 text-xs uppercase">
              Tab
            </kbd>{" "}
            to open the command menu.
          </p>
        </div>
      </form>
    </div>
  );
};

export default Editor;
