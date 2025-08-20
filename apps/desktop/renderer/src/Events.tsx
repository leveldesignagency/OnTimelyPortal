 import React from 'react';
type Event = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'PUBLISHED' | 'DRAFT';
};

const mockEvents: Event[] = [
  { id: '1', name: 'Launch Party', startDate: '2025-07-01', endDate: '2025-07-02', status: 'PUBLISHED' },
  { id: '2', name: 'Conference', startDate: '2025-08-10', endDate: '2025-08-12', status: 'DRAFT' },
];

export default function Events() {
  return (
    <div>
      <h2>Events</h2>
      <ul>
        {mockEvents.map(event => (
          <li key={event.id}>
            <strong>{event.name}</strong> ({event.status})<br />
            {event.startDate} to {event.endDate}
          </li>
        ))}
      </ul>
    </div>
  );
}           </li>
        ))}
      </ul>
    </div>
  );
} 
          </li>
        ))}
      </ul>
    </div>
  );
} 
