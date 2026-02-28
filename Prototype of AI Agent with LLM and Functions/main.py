import json
import os
import sys
from typing import List, Dict, Any
from dotenv import load_dotenv

import openai

# Load environment variables
load_dotenv()

# We will initialize the OpenAI client inside the Agent class
# so that we can check for the API key first before it crashes.

# ==========================================
# 1. Define Local Functions (Tools)
# ==========================================
def get_current_weather(location: str, unit: str = "celsius") -> str:
    """Get the current weather in a given location."""
    # This is a mock implementation.
    # In a real app, this would call a real weather API like OpenWeatherMap.
    print(f"\n[Tool Executing] -> get_current_weather(location='{location}', unit='{unit}')")
    
    # Simple hardcoded mock data for demonstration
    if "tokyo" in location.lower():
        return json.dumps({"location": "Tokyo", "temperature": "22", "unit": unit, "forecast": "sunny"})
    elif "new york" in location.lower():
        return json.dumps({"location": "New York", "temperature": "15", "unit": unit, "forecast": "cloudy"})
    elif "paris" in location.lower():
        return json.dumps({"location": "Paris", "temperature": "18", "unit": unit, "forecast": "rainy"})
    else:
        return json.dumps({"location": location, "temperature": "20", "unit": unit, "forecast": "clear"})

def calculate(expression: str) -> str:
    """Perform a mathematical calculation."""
    print(f"\n[Tool Executing] -> calculate(expression='{expression}')")
    try:
        # NOTE: eval is dangerous in production! 
        # Using it here just for a simple prototype demonstration.
        # In reality, use a safe math parser or limit the characters.
        result = eval(expression, {"__builtins__": None}, {})
        return json.dumps({"result": str(result)})
    except Exception as e:
        return json.dumps({"error": str(e)})

# Dictionary mapping function names to the actual python functions
AVAILABLE_FUNCTIONS = {
    "get_current_weather": get_current_weather,
    "calculate": calculate
}

# ==========================================
# 2. Define the Tool Schemas for OpenAI
# ==========================================
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_current_weather",
            "description": "Get the current weather in a given location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city and state, e.g. San Francisco, CA",
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "The unit of temperature to return"
                    },
                },
                "required": ["location"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate",
            "description": "Evaluate a mathematical expression",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "The mathematical expression to evaluate, e.g. '2 + 2' or '5 * 10'",
                    }
                },
                "required": ["expression"],
            },
        },
    }
]

# ==========================================
# 3. Define the Agent Logic
# ==========================================
class Agent:
    def __init__(self, model: str = "gpt-4o"):
        self.client = openai.OpenAI()
        self.model = model
        self.messages: List[Dict[str, Any]] = [
            {"role": "system", "content": "You are a helpful assistant. You have access to tools for getting weather and performing basic calculations. Use them when needed to answer the user's questions accurately."}
        ]

    def chat(self, user_input: str):
        # 1. Add user message to history
        self.messages.append({"role": "user", "content": user_input})

        while True:
            # 2. Call the LLM with current history and tools
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=self.messages,
                    tools=TOOLS,
                    tool_choice="auto", # The model decides whether to call a tool or not
                )
            except openai.APIError as e:
                print(f"OpenAI API Error: {e}")
                return
            except Exception as e:
                print(f"Error communicating with OpenAI: {e}")
                return

            response_message = response.choices[0].message
            tool_calls = response_message.tool_calls

            # 3. Check if the model wants to call a tool
            if not tool_calls:
                # No tools to call, the model generated a direct response.
                # Add the response to history and return.
                self.messages.append({"role": "assistant", "content": response_message.content})
                print(f"\nAgent: {response_message.content}")
                break

            # 4. If the model wants to call tools, handle them
            
            # The API requires us to append the assistant's tool-call request to the messages
            self.messages.append(response_message)

            for tool_call in tool_calls:
                function_name = tool_call.function.name
                
                # Check if we support this function locally
                if function_name not in AVAILABLE_FUNCTIONS:
                    print(f"\n[Warning] The model tried to call an unknown function: {function_name}")
                    function_response = json.dumps({"error": f"Unknown function: {function_name}"})
                else:
                    function_to_call = AVAILABLE_FUNCTIONS[function_name]
                    # Parse the arguments provided by the LLM
                    try:
                        function_args = json.loads(tool_call.function.arguments)
                        # Execute the function
                        function_response = function_to_call(**function_args)
                    except json.JSONDecodeError:
                        function_response = json.dumps({"error": "Failed to parse arguments."})
                    except Exception as e:
                        function_response = json.dumps({"error": str(e)})

                # 5. Append the function's response to the message history
                # We specify the role as "tool" and provide the tool_call_id
                self.messages.append(
                    {
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": function_name,
                        "content": function_response,
                    }
                )
            
            # The loop will naturally continue, and the agent will call the LLM again
            # this time with the newly added tool responses in `self.messages`.


# ==========================================
# 4. Run the CLI Loop
# ==========================================
if __name__ == "__main__":
    if not os.environ.get("OPENAI_API_KEY"):
         print("Error: OPENAI_API_KEY environment variable is not set. Please check your .env file.")
         sys.exit(1)
         
    print("=====================================================")
    print("Welcome to the AI Agent Prototype (with function calling)")
    print("Type 'exit' or 'quit' to end the conversation.")
    print("=====================================================\n")

    agent = Agent()
    
    while True:
        try:
            user_input = input("You: ")
            if user_input.lower() in ['exit', 'quit']:
                print("Goodbye!")
                break
            
            if not user_input.strip():
                continue
                
            agent.chat(user_input)
            
        except (KeyboardInterrupt, EOFError):
            print("\nGoodbye!")
            break
