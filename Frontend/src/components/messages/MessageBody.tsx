type MessageBodyProps = {
  body: string;
};

export default function MessageBody({ body }: MessageBodyProps) {
  return (
    <p className="messages-message-body">
      {body}
    </p>
  );
}
