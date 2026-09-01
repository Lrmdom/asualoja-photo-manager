import { useState } from "react";
import { useSubmit } from "react-router";
import { Button } from "./ui/button";
import { X, ZoomIn, GripVertical, Trash2 } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, TouchSensor, KeyboardSensor } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortablePhoto({ photo, onDelete, onView }: { photo: any; onDelete: () => void; onView: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: photo._key });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="relative group border rounded-md overflow-hidden aspect-square bg-muted">
      <img src={photo.secure_url} alt={photo.public_id} className="w-full h-full object-cover" />
      {/* Mobile visible fallback: semi-transparent overlay at bottom, full overlay on hover */}
      <div className="absolute inset-x-0 bottom-0 p-1 bg-black/50 flex items-center justify-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost" className="text-white h-7 w-7" onClick={onView}><ZoomIn className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="text-white h-7 w-7" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        <div {...attributes} {...listeners} className="cursor-grab text-white flex items-center justify-center h-7 w-7 touch-none"><GripVertical className="h-4 w-4" /></div>
      </div>
    </div>
  );
}

export function PhotoManagerModal({ variant, onClose }: { variant: any; onClose: () => void }) {
  const submit = useSubmit();
  const [photos, setPhotos] = useState(variant.cloudinaryList || []);
  const [fullView, setFullView] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
        activationConstraint: {
          delay: 200,
          tolerance: 5,
        },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDelete = (key: string, public_id: string) => {
    if (confirm("Tem certeza que deseja remover esta foto?")) {
        const formData = new FormData();
        formData.append("intent", "delete-photo");
        formData.append("variantId", variant._id);
        formData.append("key", key);
        formData.append("public_id", public_id);
        submit(formData, { method: "post", action: "/?index" });
        setPhotos(photos.filter((p: any) => p._key !== key));
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = photos.findIndex((p: any) => p._key === active.id);
      const newIndex = photos.findIndex((p: any) => p._key === over.id);
      const newPhotos = arrayMove(photos, oldIndex, newIndex);
      setPhotos(newPhotos);

      const formData = new FormData();
      formData.append("intent", "reorder-photos");
      formData.append("variantId", variant._id);
      formData.append("order", JSON.stringify(newPhotos));
      submit(formData, { method: "post", action: "/?index" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-background w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Gerir Fotos: {variant.sku}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <SortableContext items={photos.map((p: any) => p._key)} strategy={rectSortingStrategy}>
              {photos.map((p: any) => (
                <SortablePhoto
                  key={p._key}
                  photo={p}
                  onDelete={() => handleDelete(p._key, p.public_id)}
                  onView={() => setFullView(p.secure_url)}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      </div>

      {fullView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setFullView(null)}>
          <img src={fullView} className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}
