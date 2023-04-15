import type { Message } from "./ChatWindow";
import axios from "axios";
import type { ModelSettings } from "../utils/types";
import {
  createAgent,
  executeAgent,
  startAgent,
} from "../services/agent-service";

class AutonomousAgent {
  name: string;
  goal: string;
  tasks: string[] = [];
  completedTasks: string[] = [];
  modelSettings: ModelSettings;
  isRunning = true;
  sendMessage: (message: Message) => void;
  shutdown: () => void;
  numLoops = 0;

  constructor(
    name: string,
    goal: string,
    addMessage: (message: Message) => void,
    shutdown: () => void,
    modelSettings: ModelSettings
  ) {
    this.name = name;
    this.goal = goal;
    this.sendMessage = addMessage;
    this.shutdown = shutdown;
    this.modelSettings = modelSettings;
  }

  async run() {
    this.sendGoalMessage();
    this.sendThinkingMessage();

    // Initialize by getting tasks
    try {
      this.tasks = await this.getInitialTasks();
      for (const task of this.tasks) {
        await new Promise((r) => setTimeout(r, 800));
        this.sendTaskMessage(task);
      }
    } catch (e) {
      console.log(e);
      this.sendErrorMessage(
        this.modelSettings.customApiKey !== ""
          ? `ERROR retrieving initial tasks array. Make sure your API key is not the free tier, make your goal more clear, or revise your goal such that it is within our model's policies to run. Shutting Down.`
          : `ERROR retrieving initial tasks array. Retry, make your goal more clear, or revise your goal such that it is within our model's policies to run. Shutting Down.`
      );
      this.shutdown();
      return;
    }

    await this.loop();
  }

  async loop() {
    console.log(`Loop ${this.numLoops}`);
    console.log(this.tasks);

    if (!this.isRunning) {
      this.sendManualShutdownMessage();
      this.shutdown();
      return;
    }

    if (this.tasks.length === 0) {
      this.sendCompletedMessage();
      this.shutdown();
      return;
    }

    this.numLoops += 1;
    const maxLoops = this.modelSettings.customApiKey === "" ? 4 : 100;
    if (this.numLoops > maxLoops) {
      this.sendLoopMessage();
      this.shutdown();
      return;
    }

    // Wait before starting
    await new Promise((r) => setTimeout(r, 1000));

    // Execute first task
    // Get and remove first task
    this.completedTasks.push(this.tasks[0] || "");
    const currentTask = this.tasks.shift();
    this.sendThinkingMessage();

    const result = await this.executeTask(currentTask as string);
    this.sendExecutionMessage(currentTask as string, result);

    // Wait before adding tasks
    await new Promise((r) => setTimeout(r, 1000));
    this.sendThinkingMessage();

    // Add new tasks
    try {
      const newTasks = await this.getAdditionalTasks(
        currentTask as string,
        result
      );
      this.tasks = this.tasks.concat(newTasks);
      for (const task of newTasks) {
        await new Promise((r) => setTimeout(r, 800));
        this.sendTaskMessage(task);
      }

      if (newTasks.length == 0) {
        this.sendActionMessage("Task marked as complete!");
      }
    } catch (e) {
      console.log(e);
      this.sendErrorMessage(
        `ERROR adding additional task(s). It might have been against our model's policies to run them. Continuing.`
      );
      this.sendActionMessage("Task marked as complete.");
    }

    await this.loop();
  }

  async getInitialTasks(): Promise<string[]> {
    if (this.shouldRunClientSide()) {
      return await startAgent(this.modelSettings, this.goal);
    }

    const res = await axios.post(`/api/chain`, {
      modelSettings: this.modelSettings,
      goal: this.goal,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-argument
    return res.data.newTasks as string[];
  }

  async getAdditionalTasks(
    currentTask: string,
    result: string
  ): Promise<string[]> {
    if (this.shouldRunClientSide()) {
      return await createAgent(
        this.modelSettings,
        this.goal,
        this.tasks,
        currentTask,
        result,
        this.completedTasks
      );
    }

    const res = await axios.post(`/api/create`, {
      modelSettings: this.modelSettings,
      goal: this.goal,
      tasks: this.tasks,
      lastTask: currentTask,
      result: result,
      completedTasks: this.completedTasks,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
    return res.data.newTasks as string[];
  }

  async executeTask(task: string): Promise<string> {
    if (this.shouldRunClientSide()) {
      return await executeAgent(this.modelSettings, this.goal, task);
    }

    const res = await axios.post(`/api/execute`, {
      modelSettings: this.modelSettings,
      goal: this.goal,
      task: task,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-argument
    return res.data.response as string;
  }

  private shouldRunClientSide() {
    return this.modelSettings.customApiKey != "";
  }

  stopAgent() {
    this.isRunning = false;
  }

  sendGoalMessage() {
    this.sendMessage({ type: "goal", value: this.goal });
  }

  sendLoopMessage() {
    this.sendMessage({
      type: "system",
      value:
        this.modelSettings.customApiKey !== ""
          ? `该代理运行时间过长（25 个循环）。 为了节省您的钱包和我们的基础设施成本，该代理正在关闭。 以后迭代次数可配置.`
          : "很抱歉，因为这是一个演示，我们不能让我们的代理运行太久。 请注意，如果您希望运行更长的时间，请在设置中提供您自己的 API 密钥。 关机.",
    });
  }

  sendManualShutdownMessage() {
    this.sendMessage({
      type: "system",
      value: `The agent has been manually shutdown.`,
    });
  }

  sendCompletedMessage() {
    this.sendMessage({
      type: "system",
      value: "All tasks completed. Shutting down.",
    });
  }

  sendThinkingMessage() {
    this.sendMessage({ type: "thinking", value: "" });
  }

  sendTaskMessage(task: string) {
    this.sendMessage({ type: "task", value: task });
  }

  sendErrorMessage(error: string) {
    this.sendMessage({ type: "system", value: error });
  }

  sendExecutionMessage(task: string, execution: string) {
    this.sendMessage({
      type: "action",
      info: `Executing "${task}"`,
      value: execution,
    });
  }

  sendActionMessage(message: string) {
    this.sendMessage({
      type: "action",
      info: message,
      value: "",
    });
  }
}

export default AutonomousAgent;
