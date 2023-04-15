import React from "react";
import Button from "./Button";
import { FaKey, FaMicrochip } from "react-icons/fa";
import Dialog from "./Dialog";
import Input from "./Input";

export default function SettingsDialog({
  show,
  close,
  customApiKey,
  setCustomApiKey,
  customModelName,
  setCustomModelName,
}: {
  show: boolean;
  close: () => void;
  customApiKey: string;
  setCustomApiKey: (key: string) => void;
  customModelName: string;
  setCustomModelName: (key: string) => void;
}) {
  const [key, setKey] = React.useState<string>(customApiKey);

  const handleClose = () => {
    setKey(customApiKey);
    close();
  };

  const handleSave = () => {
    setCustomApiKey(key);
    close();
  };

  return (
    <Dialog
      header="Settings ⚙"
      isShown={show}
      close={handleClose}
      footerButton={<Button onClick={handleSave}>保存</Button>}
    >
      <div className="text-md relative flex-auto p-2 leading-relaxed">
        <p className="mb-3">
        欢迎来到 AgentGPT！ 我们收到的流量远远高于我们的流量小团队目前能够提供.
        </p>
        <p className="mb-3">
        因此，我们暂时要求用户使用自己的AgentGPT的OpenAI API密钥。{" "}
          <em>
          这只会在当前浏览器会话中使用，不会存储任何地方。
          </em>{" "}
          如果您选择不这样做，您的代理人将无法执行很长时间
           长的。 为此，请注册一个OpenAI帐户并访问下列的{" "}
          <a
            href="https://platform.openai.com/account/api-keys"
            className="text-blue-500"
          >
            链接.
          </a>
        </p>
        <Input
          left={
            <>
              <FaMicrochip/>
              <span className="ml-2">模型:</span>
            </>
          }
          placeholder={"gpt-3.5-turbo"}
          value={customModelName}
          onChange={(e) => setCustomModelName(e.target.value)}
        />
        <br />
        <Input
          left={
            <>
              <FaKey />
              <span className="ml-2">Key: </span>
            </>
          }
          placeholder={"sk-..."}
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <strong className="mt-10">
        注意：这必须是付费的 OpenAI API 帐户，而不是免费套餐。 这
           不同于ChatGPT Plus订阅。
        </strong>
      </div>
    </Dialog>
  );
}
