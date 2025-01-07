import tkinter as tk
from tkinter import messagebox

class Node:
    def __init__(self, sign, left=None, right=None, invert=False):
        self.sign = sign
        self.left = left
        self.right = right
        self.invert = invert

    def set_invert(self):
        self.invert = not self.invert

class TruthTableGenerator(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Truth Table Generator")
        self.geometry("600x700")

        tk.Label(self, text="Enter logical expression (+ for OR, * for AND, ^ for XOR, ' for NOT):", font=("Arial", 12)).pack(pady=10)
        self.input_entry = tk.Entry(self, font=("Arial", 14), width=40)
        self.input_entry.pack(pady=10)
        
        self.generate_button = tk.Button(self, text="Generate Truth Table", command=self.generate_truth_table, font=("Arial", 12))
        self.generate_button.pack(pady=10)
        
        self.output_text = tk.Text(self, wrap=tk.WORD, font=("Courier", 12), height=30, width=70)
        self.output_text.pack(pady=10)

    def solve(self, node, values):
        if node.sign.isalpha():
            result = values[node.sign]
        else:
            left_val = self.solve(node.left, values)
            right_val = self.solve(node.right, values) if node.right else None
            if node.sign == '+':
                result = left_val or right_val
            elif node.sign == '*':
                result = left_val and right_val
            elif node.sign == '^':
                result = left_val ^ right_val
        return not result if node.invert else result

    def parse_expression(self, expr, variables):
        precedence = {'+': 1, '*': 2, '^': 2}
        op_stack = []
        node_stack = []

        for char in f'({expr})':
            if char == '(':
                op_stack.append(char)
            elif char.isalpha():
                node_stack.append(Node(char))
                variables.add(char)
            elif char == '\'':
                node_stack[-1].set_invert()
            elif char in precedence:
                while op_stack and op_stack[-1] != '(' and precedence[op_stack[-1]] >= precedence[char]:
                    right = node_stack.pop()
                    left = node_stack.pop()
                    node_stack.append(Node(op_stack.pop(), left, right))
                op_stack.append(char)
            elif char == ')':
                while op_stack[-1] != '(':
                    right = node_stack.pop()
                    left = node_stack.pop()
                    node_stack.append(Node(op_stack.pop(), left, right))
                op_stack.pop()

        return node_stack.pop()

    def generate_truth_table(self):
        expr = self.input_entry.get().strip()
        if not expr:
            messagebox.showerror("Error", "Please enter a logical expression.")
            return

        variables = set()
        root = self.parse_expression(expr, variables)
        variables = sorted(variables)

        result = f"{' '.join(variables)} | Result\n" + "-" * (4 * len(variables) + 8) + "\n"
        for i in range(2 ** len(variables)):
            values = {var: (i >> idx) & 1 for idx, var in enumerate(variables)}
            result += f"{' '.join(map(str, values.values()))} | {int(self.solve(root, values))}\n"

        self.output_text.delete(1.0, tk.END)
        self.output_text.insert(tk.END, result)

if __name__ == "__main__":
    app = TruthTableGenerator()
    app.mainloop()
