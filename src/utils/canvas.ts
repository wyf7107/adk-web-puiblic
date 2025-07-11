import {AgentNode, DiagramNode, ToolNode} from '../app/core/models/AgentBuilder';
import Konva from "konva";

export class CanvasUtils {

    static drawAgentNode(layer: Konva.Layer, node: DiagramNode, settingsCallback: any, addSubAgentCallback: any, addToolCallback: any, dragEndCallback: any) {
        if (node.type !== 'agent') return;
        const agentData = node.data as AgentNode;
        const group = new Konva.Group({
            x: node.x,
            y: node.y,
            draggable: true, // Make the entire group draggable
            id: node.id,
        });
        // Create the rectangle
        const rect = new Konva.Rect({
            width: 300,
            height: 300,
            fill: node.color,
            cornerRadius: 10
        });

        // Create the label (Text)
        const label = new Konva.Text({
            x: 20, // Position relative to the group
            y: 20, // Position relative to the group
            text: node.icon + agentData.agentName,
            fontSize: 20,
            fontFamily: 'Google Sans',
            fill: '#E2E8F0',
            name: 'agent-name',
        });

        const agentTypeChip = new Konva.Label({
            x: 20,
            y: 50,
            opacity: 0.75
        })

        agentTypeChip.add(new Konva.Tag({
            fill: 'yellow'
        }))
        agentTypeChip.add(new Konva.Text({
            text: agentData.agentType,
            fontFamily: 'Google Sans',
            fontSize: 18,
            padding: 5,
            fill: 'black',
            name: 'agent-type'
        }))

        const modelChip = new Konva.Label({
            x: 20,
            y: 80,
            opacity: 0.75
        })

        modelChip.add(new Konva.Tag({
            fill: 'yellow'
        }))
        modelChip.add(new Konva.Text({
            text: agentData.model,
            fontFamily: 'Google Sans',
            fontSize: 18,
            padding: 5,
            fill: 'black',
            name: 'agent-model'
        }))

        const instructionText = new Konva.Text({
            x: 20,
            y: 120,
            text: agentData.instructions,
            height: 100,
            fontSize: 18,
            fontFamily: 'Google Sans',
            fill: 'black',
            width: 250,
            padding: 10,
            ellipsis: true,
            align: 'left',
            name: 'agent-instructions'
        });

        const instructionRect = new Konva.Rect({
            x: 20,
            y: 120,
            stroke: '#555',
            strokeWidth: 2,
            fill: '#ddd',
            width: 250,
            height: instructionText.height(),
            shadowColor: 'black',
            shadowBlur: 10,
            shadowOffsetX: 10,
            shadowOffsetY: 10,
            shadowOpacity: 0.2,
            cornerRadius: 10
        });

        const settingsIcon = new Konva.Text({
            x: rect.width() - 40, // Position it inside the button
            y: 15,
            text: 'settings', // Material Icons "three vertical dots" icon name
            fontSize: 24,
            fontFamily: 'Material Icons', // Font family set to Material Icons
            fill: '#E2E8F0',
        });

        settingsIcon.on('click', function () {
            if (settingsCallback) {
                settingsCallback(node, group);
            }
        });

        const addToolButton = new Konva.Rect({
            x: 20,
            y: rect.height() - 60,
            width: 100,
            height: 26,
            fill: '#E2E8F0',
            opacity: 0.75,
            cornerRadius: 8,
        })

        const addToolButtonText = new Konva.Text({
            x: 30,
            y: rect.height() - 55,
            width: 100,
            height: 26,
            text: 'Add Tools',
            fill: 'black',
            fontSize: 18,
            fontFamily: 'Google Sans',
        })

        const handleAddToolClick = () => {
            if (addToolCallback) {
                addToolCallback(node, group);
            }
        };
        addToolButton.on('click', handleAddToolClick);
        addToolButtonText.on('click', handleAddToolClick);


        const addSubAgentsButton = new Konva.Rect({
            x: 125,
            y: rect.height() - 60,
            width: 145,
            height: 26,
            fill: '#E2E8F0',
            opacity: 0.75,
            cornerRadius: 8,
        })

        const addSubAgentsButtonText = new Konva.Text({
            x: 135,
            y: rect.height() - 55,
            width: 140,
            height: 26,
            text: 'Add Sub Agents',
            fill: 'black',
            fontSize: 18,
            fontFamily: 'Google Sans',
        })

        const handleAddSubAgentClick = () => {
            if (addSubAgentCallback) {
                addSubAgentCallback(node, group);
            }
        };
        addSubAgentsButton.on('click', handleAddSubAgentClick);
        addSubAgentsButtonText.on('click', handleAddSubAgentClick);

        // Add the rectangle and label to the group
        group.add(rect);
        group.add(label);
        group.add(agentTypeChip);
        group.add(modelChip);
        group.add(instructionRect);
        group.add(instructionText);
        group.add(settingsIcon);
        group.add(addToolButton);
        group.add(addToolButtonText);
        group.add(addSubAgentsButton);
        group.add(addSubAgentsButtonText);

        group.on('dragend', () => {
            dragEndCallback?.(node, group.position());
        });

        layer.add(group);
    }

    static drawToolNode(layer: Konva.Layer, node: DiagramNode, settingsCallback: any, dragEndCallback: any) {
        if (node.type !== 'tool') return;
        const toolData = node.data as ToolNode;

        const group = new Konva.Group({
            x: node.x,
            y: node.y,
            draggable: true,
            id: node.id,
        });

        const rect = new Konva.Rect({
            width: 250,
            height: 150,
            fill: node.color,
            cornerRadius: 10
        });

        const label = new Konva.Text({
            x: 20,
            y: 20,
            text: node.icon + toolData.toolName,
            fontSize: 20,
            fontFamily: 'Google Sans',
            fill: '#E2E8F0',
            name: 'tool-name',
        });

        const toolTypeChip = new Konva.Label({
            x: 20,
            y: 50,
            opacity: 0.75
        });

        toolTypeChip.add(new Konva.Tag({ fill: '#A0AEC0' }));
        toolTypeChip.add(new Konva.Text({
            text: toolData.toolType,
            fontFamily: 'Google Sans',
            fontSize: 18,
            padding: 5,
            fill: 'black',
            name: 'tool-type'
        }));

        const settingsIcon = new Konva.Text({
            x: rect.width() - 40,
            y: 15,
            text: 'settings',
            fontSize: 24,
            fontFamily: 'Material Icons',
            fill: '#E2E8F0',
        });

        settingsIcon.on('click', () => settingsCallback?.(node, group));

        group.add(rect, label, toolTypeChip, settingsIcon);

        if (toolData.toolCode) {
            const codeSnippetRect = new Konva.Rect({
                x: 20,
                y: 90,
                stroke: '#555',
                strokeWidth: 1,
                fill: '#2D3748',
                width: 210,
                height: 50,
                cornerRadius: 5,
            });

            const codeSnippetText = new Konva.Text({
                x: 20,
                y: 90,
                text: toolData.toolCode,
                fontSize: 14,
                fontFamily: 'monospace',
                fill: '#E2E8F0',
                width: 210,
                height: 50,
                padding: 5,
                ellipsis: true,
            });
            group.add(codeSnippetRect, codeSnippetText);
        }

        group.on('dragend', () => {
            dragEndCallback?.(node, group.position());
        });

        layer.add(group);
    }
}